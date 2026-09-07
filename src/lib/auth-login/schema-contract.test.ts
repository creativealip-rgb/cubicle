import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync("drizzle/0091_password_email_otp_recovery.sql", "utf8");
describe("password OTP recovery migration contract", () => {
  it("defines additive auth tables, checks, indexes, and idempotent migration record", () => {
    for (const table of ["auth_login_otp_challenges", "auth_trusted_devices", "auth_recovery_handoffs", "auth_recovery_authorizations"]) expect(migration).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    expect(migration).toMatch(/attempts integer NOT NULL DEFAULT 0 CHECK \(attempts BETWEEN 0 AND 5\)/i);
    expect(migration).toMatch(/flow_id text NOT NULL/i);
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS .*active.*challenge.*\(user_id, flow_id\) WHERE consumed_at IS NULL/i);
    expect(migration).toMatch(/purpose text NOT NULL CHECK \(purpose IN \('login'\)\)/i);
    expect(migration).toMatch(/method text NOT NULL CHECK \(method IN \('passkey','backup_code','manual_admin'\)\)/i);
    expect(migration).toMatch(/scope text NOT NULL CHECK \(scope IN \('email-access-lost'\)\)/i);
    expect(migration).toMatch(/token_hash text NOT NULL UNIQUE/i);
    expect(migration).toMatch(/ON CONFLICT \(id\) DO NOTHING/i);
  });
  it("keeps auth table user references and recovery authorization uniqueness explicit", () => {
    expect(migration.match(/REFERENCES users\(id\) ON DELETE CASCADE/g)?.length).toBeGreaterThanOrEqual(4);
    expect(migration).toMatch(/UNIQUE \(session_id, scope\)/i);
  });
});
