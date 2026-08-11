import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

const storageQuota = () => read("src/lib/storage-quota.ts");
const filesActions = () => read("src/lib/actions/files.ts");
const normalUploadRoute = () => read("src/app/api/files/upload/route.ts");
const portalFilesRoute = () => read("src/app/api/client-portal/files/upload/route.ts");
const portalRequestsRoute = () => read("src/app/api/client-portal/requests/upload/route.ts");

describe("workspace storage quota guard", () => {
  it("completeUpload enforces the quota atomically around the files insert", () => {
    const body = filesActions();
    const txStart = body.indexOf("db.transaction(async (tx) => {");
    const reserveAt = body.indexOf("reserveWorkspaceUploadTx(tx, parsed.workspaceId");
    const insertAt = body.indexOf(".insert(files).values({");
    const consumeAt = body.indexOf("consumeWorkspaceUploadTx(tx, parsed.workspaceId");
    expect(txStart).toBeGreaterThanOrEqual(0);
    // Order inside the transaction: reserve -> insert -> consume.
    expect(txStart).toBeLessThan(reserveAt);
    expect(reserveAt).toBeLessThan(insertAt);
    expect(insertAt).toBeLessThan(consumeAt);
    // Quota rejection happens inside reserve helper before row write.
    expect(body).toContain("reserveWorkspaceUploadTx(tx, parsed.workspaceId");
  });

  it("direct completeUpload cannot bypass the workspace byte/file limits", () => {
    const body = filesActions();
    // No bare insert outside the guarded transaction.
    const bare = body.replace(/db\.transaction[\s\S]*?\);\n\s*}/, "");
    expect(bare.indexOf(".insert(files)")).toBeLessThan(0);
    // Every file insert inside completeUpload is preceded by a reserve.
    const complete = body.slice(body.indexOf("export async function completeUpload"));
    const insert = complete.indexOf(".insert(files)");
    expect(complete.slice(0, insert)).toContain("reserveWorkspaceUploadTx");
  });

  it("normal upload route does not double-reserve (completeUpload guards itself)", () => {
    const body = normalUploadRoute();
    // The route keeps the fast-fail pre-check but no longer reserves/consumes.
    expect(body).toContain("assertUploadQuota(workspaceId, file.size, clientId)");
    expect(body).not.toContain("reserveWorkspaceUpload");
    expect(body).not.toContain("consumeWorkspaceUpload");
    expect(body).not.toContain("releaseWorkspaceUpload");
    expect(body).not.toContain("reservedBytes");
    // It still delegates to the guarded action.
    expect(body).toContain("await completeUpload({");
  });

  it("every other file-insert upload path shares the same workspace quota guard", () => {
    const portalFiles = portalFilesRoute();
    const portalRequests = portalRequestsRoute();
    // Reservation happens before the R2 write and before the DB insert.
    for (const [name, body] of [
      ["client-portal/files", portalFiles],
      ["client-portal/requests", portalRequests],
    ] as const) {
      const reserve = body.indexOf("reserveWorkspaceUpload(client.workspaceId");
      const r2 = body.indexOf("new PutObjectCommand");
      const insert = body.indexOf(".insert(files)");
      expect(reserve, `${name} must reserve`).toBeGreaterThanOrEqual(0);
      expect(reserve, `${name} must reserve before R2`).toBeLessThan(r2);
      expect(reserve, `${name} must reserve before insert`).toBeLessThan(insert);
      expect(body).toContain("consumeWorkspaceUpload(client.workspaceId");
      expect(body).toContain("releaseWorkspaceUpload");
    }
  });

  it("storage-quota exports reserve/consume/release and a shared atomic wrapper", () => {
    const src = storageQuota();
    // The Tx-core is the single source of truth for the quota math.
    expect(src).toContain("export async function reserveWorkspaceUploadTx(");
    expect(src).toContain("export async function consumeWorkspaceUploadTx(");
    // Standalone reserve is one atomic transaction (upsert + lock + check + increment).
    expect(src).toContain("onConflictDoNothing()");
    expect(src).toContain('.for("update")');
    expect(src).toContain("greatest(0,");
    // Release/consume never go negative.
    expect(src).toContain("reservedFiles} - 1");
    // withWorkspaceQuotaReservation runs work between reserve and consume in one tx.
    expect(src).toContain("export async function withWorkspaceQuotaReservation");
    expect(src).toContain("await reserveWorkspaceUploadTx(tx,");
    expect(src).toContain("await consumeWorkspaceUploadTx(tx,");
  });

  it("consumeWorkspaceUpload is the same non-negative release as releaseWorkspaceUpload", () => {
    const src = storageQuota();
    expect(src).toMatch(/export const consumeWorkspaceUpload = releaseWorkspaceUpload;/);
  });

  it("portal upload routes wire reserve/release/consume from storage-quota", () => {
    const src = storageQuota();
    // storage-quota exports the standalone helpers the portal routes rely on.
    expect(src).toContain("export async function reserveWorkspaceUpload(");
    expect(src).toContain("export async function releaseWorkspaceUpload(");
    expect(src).toContain("export const consumeWorkspaceUpload = releaseWorkspaceUpload;");
    // Both portal routes import and use all three helpers (reservation is
    // committed before R2/insert; release is the failure-path cleanup).
    for (const [name, body] of [
      ["client-portal/files", portalFilesRoute()],
      ["client-portal/requests", portalRequestsRoute()],
    ] as const) {
      expect(body, `${name} import`).toContain(
        'import { reserveWorkspaceUpload, releaseWorkspaceUpload, consumeWorkspaceUpload } from "@/lib/storage-quota";',
      );
      expect(body, `${name} reserve`).toContain("await reserveWorkspaceUpload(client.workspaceId, upload.size);");
      expect(body, `${name} consume`).toContain("await consumeWorkspaceUpload(client.workspaceId, upload.size);");
      expect(body, `${name} release`).toContain("releaseWorkspaceUpload(reservedWorkspaceId, reservedBytes)");
    }
  });
});
