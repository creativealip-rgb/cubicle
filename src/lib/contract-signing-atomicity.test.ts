import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/lib/actions/contracts.ts"), "utf8");

function functionBody(name: string) {
  const start = source.indexOf(`export async function ${name}`);
  if (start < 0) throw new Error(`${name} not found`);
  const next = source.indexOf("\nexport async function ", start + 1);
  return source.slice(start, next < 0 ? source.length : next);
}

describe("contract signing atomicity wiring", () => {
  const body = functionBody("signContract");

  it("serializes signing by locking the contract row inside one transaction", () => {
    expect(body).toContain("db.transaction");
    expect(body).toContain('.for("update")');
    // The lock is taken before the already-signed / lifecycle re-check
    expect(body.indexOf(".for(\"update\")")).toBeGreaterThan(-1);
    expect(body.indexOf('.for("update")')).toBeLessThan(
      body.indexOf('locked.status === "signed"'),
    );
  });

  it("re-checks the token lifecycle and already-signed guard under the lock", () => {
    expect(body).toContain("assertPublicTokenLifecycle");
    expect(body).toContain('allowedStatuses: ["sent", "viewed", "signed"]');
    expect(body).toContain('throw new Error("Contract already signed")');
    // The guard reads from the locked row, not a pre-lock snapshot
    expect(body).toMatch(/locked\.status === "signed"/);
  });

  it("keeps every signing write on the transaction client", () => {
    expect(body).not.toMatch(/await db\.(insert|update|delete)/);
    expect(body).toMatch(/tx\.update\(contracts\)/);
    expect(body).toContain("signedName");
    expect(body).toContain("signatureDataUrl");
    expect(body).toContain("signedFromIp");
    expect(body).toContain("signedUserAgent");
  });

  it("preserves audit log, best-effort notify, and email-failure semantics", () => {
    expect(body).toContain('"signed_contract"');
    expect(body).toContain("notifyWorkspaceMembers");
    expect(body).toContain("contract_signed");
  });

  it("guards the post-commit audit log so a log failure never fakes a sign failure", () => {
    const auditIdx = body.indexOf("await writeActivityLog(");
    const tryIdx = body.lastIndexOf("try {", auditIdx);
    const catchIdx = body.indexOf("catch {", auditIdx);
    expect(auditIdx).toBeGreaterThan(-1);
    // The audit log sits inside a try/catch, after the commit (not inside the tx)
    expect(tryIdx).toBeGreaterThan(-1);
    expect(tryIdx).toBeLessThan(auditIdx);
    expect(auditIdx).toBeLessThan(catchIdx);
    expect(body.slice(tryIdx, catchIdx)).toContain("writeActivityLog");
    // The committed signature is returned after the guard — no throw path between
    expect(body.indexOf("return updated;")).toBeGreaterThan(catchIdx);
  });
});
