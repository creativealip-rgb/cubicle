import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0097_upload_intent_foundation.sql", "utf8");
const schema = readFileSync("src/db/schema.ts", "utf8");

describe("upload intent persistence contract", () => {
  it("persists scope, exact keys, immutable expectations, expiry, and idempotency", () => {
    for (const field of ["workspace_id", "actor_type", "actor_id", "destination_type", "destination_id", "idempotency_key", "quarantine_key", "final_key", "expected_mime", "expected_bytes", "max_bytes", "expected_sha256", "expires_at"]) expect(migration).toContain(field);
    expect(migration).toContain("upload_intents_actor_idempotency_unique");
    expect(migration).toContain("^[0-9a-f]{64}$");
  });

  it("persists fencing, leases, retries, final pointer, and CAS versions", () => {
    for (const field of ["promotion_attempt_id", "promotion_lease_owner", "promotion_lease_expires_at", "retry_count", "cleanup_retry_at", "final_file_id", "version integer"]) expect(migration).toContain(field);
    expect(schema).toContain('export const uploadIntents = pgTable("upload_intents"');
  });

  it("uses a one-intent quota reservation with explicit terminal transitions", () => {
    expect(migration).toContain("intent_id uuid NOT NULL UNIQUE");
    expect(migration).toContain("state IN ('active','consumed','released')");
    expect(migration).toContain("upload_quota_reservations_active_idx");
    expect(schema).toContain('export const uploadQuotaReservations = pgTable("upload_quota_reservations"');
  });
});
