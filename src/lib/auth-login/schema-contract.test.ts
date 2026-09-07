import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0091_password_email_otp_recovery.sql", "utf8");
describe("password OTP recovery migration contract", () => {
  it("defines additive auth tables, checks, indexes, and idempotent migration record", () => {
    for (const table of ["auth_login_otp_challenges", "auth_trusted_devices", "auth_recovery_handoffs"]) expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    expect(migration).toMatch(/attempts integer NOT NULL DEFAULT 0 CHECK \(attempts BETWEEN 0 AND 5\)/i);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS .*active.*challenge/i);
    expect(migration).toMatch(/token_hash text NOT NULL UNIQUE/i);
    expect(migration).toMatch(/ON CONFLICT \(id\) DO NOTHING/i);
  });
});
