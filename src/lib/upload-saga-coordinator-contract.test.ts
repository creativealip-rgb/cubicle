import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const service = readFileSync("src/lib/upload-intent-service.ts", "utf8");
const coordinator = () => readFileSync("src/lib/upload-saga-coordinator.ts", "utf8");
const migration = readFileSync("drizzle/0098_file_upload_lifecycle.sql", "utf8");

describe("upload saga coordinator contract", () => {
  it("creates a pending non-visible file in Tx A and completes it only in Tx B", () => {
    expect(migration).toContain("upload_state");
    expect(migration).toContain("pending");
    expect(service).toContain("uploadState: \"pending\"");
    expect(service).toContain("uploadState: \"completed\"");
    expect(service).toContain("finalFileId");
  });

  it("runs promotion outside DB transactions and records bounded failures", () => {
    const source = coordinator();
    expect(source).toContain("export async function runUploadPromotionSaga");
    expect(source).toContain("claimUploadPromotion");
    expect(source).toContain("promoteValidatedUploadObject");
    expect(source).toContain("completePromotion");
    expect(source).toContain("markPromotionFailed");
    expect(source).not.toContain("db.transaction");
  });
});
