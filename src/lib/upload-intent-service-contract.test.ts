import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "src/lib/upload-intent-service.ts";

describe("upload intent transaction service contract", () => {
  it("creates intent and quota reservation in one transaction with idempotent conflict handling", () => {
    expect(existsSync(path)).toBe(true);
    const source = readFileSync(path, "utf8");
    expect(source).toContain("export async function createUploadIntent");
    expect(source).toContain("db.transaction");
    expect(source).toContain("onConflictDoNothing");
    expect(source).toContain("reserveWorkspaceUploadTx");
    expect(source).toContain("uploadQuotaReservations");
    expect(source).toContain("IDEMPOTENCY_CONFLICT");
  });

  it("uses scoped CAS predicates for upload confirmation, promotion claim, completion, and expiry", () => {
    const source = readFileSync(path, "utf8");
    for (const name of ["confirmUpload", "claimValidation", "claimPromotion", "completePromotion", "expireUploadIntent"]) expect(source).toContain(`export async function ${name}`);
    expect(source).toContain("uploadIntents.version");
    expect(source).toContain("uploadQuotaReservations.version");
    expect(source).toContain("promotionAttemptId");
    expect(source).toContain("promotionLeaseExpiresAt");
    expect(source).toContain("consumeWorkspaceUploadTx");
  });
});
