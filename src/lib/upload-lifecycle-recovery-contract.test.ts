import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const schema = readFileSync("src/db/schema.ts", "utf8");
const migration = readFileSync("drizzle/0099_upload_lifecycle_recovery.sql", "utf8");
const service = readFileSync("src/lib/upload-intent-service.ts", "utf8");

describe("upload lifecycle recovery", () => {
  it("persists validation fencing and leases", () => {
    for (const field of ["validationAttemptId", "validationLeaseOwner", "validationLeaseExpiresAt"]) expect(schema).toContain(field);
    expect(migration).toContain("validation_attempt_id");
    expect(service).toContain("renewValidationLease");
  });

  it("supports bounded retry and stale promotion recovery", () => {
    expect(service).toContain("retryFailedPromotion");
    expect(service).toContain("recoverStalePromotion");
    expect(service).toContain('state: "failed_cleanup"');
    expect(service).toContain("cleanupRetryAt");
  });
});
