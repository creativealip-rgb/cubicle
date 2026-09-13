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

  it("normal upload route reserves once through upload intent saga", () => {
    const body = normalUploadRoute();
    expect(body).toContain("await createUploadIntent({");
    expect(body).toContain("await runUploadPromotionSaga({");
    expect(body).not.toContain("assertUploadQuota(");
    expect(body).not.toContain("reserveWorkspaceUpload");
    expect(body).not.toContain("consumeWorkspaceUpload");
    expect(body).not.toContain("await completeUpload({");
  });

  it("portal file uploads delegate file insertion and quota to the saga", () => {
    const portalFiles = portalFilesRoute();
    const portalRequests = portalRequestsRoute();
    for (const [name, body] of [
      ["client-portal/files", portalFiles],
      ["client-portal/requests", portalRequests],
    ] as const) {
      expect(body, `${name} saga`).toContain("promoteBufferedUpload");
      expect(body, `${name} no direct object write`).not.toContain("new PutObjectCommand");
      expect(body, `${name} no direct file insert`).not.toContain(".insert(files)");
      expect(body).not.toContain("reserveWorkspaceUpload(client.workspaceId");
      expect(body).not.toContain("consumeWorkspaceUpload(client.workspaceId");
      expect(body).not.toContain("releaseWorkspaceUpload");
      expect(body).not.toContain("reservedBytes");

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

  it("portal upload routes avoid legacy quota helpers", () => {
    const src = storageQuota();
    // storage-quota still exports the standalone helpers for other callers,
    // but the portal routes must use the single-transaction wrapper so the
    // reservation cannot leak when the process dies between insert and consume.
    expect(src).toContain("export async function reserveWorkspaceUpload(");
    expect(src).toContain("export async function releaseWorkspaceUpload(");
    expect(src).toContain("export const consumeWorkspaceUpload = releaseWorkspaceUpload;");
    for (const [name, body] of [
      ["client-portal/files", portalFilesRoute()],
      ["client-portal/requests", portalRequestsRoute()],
    ] as const) {
      expect(body, `${name} saga`).toContain("promoteBufferedUpload");
      expect(body, `${name} no legacy wrapper`).not.toContain("withWorkspaceQuotaReservation");
      // No standalone reserve/consume/release — those left reservedBytes stuck
      // forever on crash.
      expect(body, `${name} no standalone reserve`).not.toContain("reserveWorkspaceUpload");
      expect(body, `${name} no standalone consume`).not.toContain("consumeWorkspaceUpload");
      expect(body, `${name} no standalone release`).not.toContain("releaseWorkspaceUpload");
    }
  });
});
