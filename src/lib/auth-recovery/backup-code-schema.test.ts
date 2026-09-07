import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
const migration = readFileSync(
  "drizzle/0092_independent_backup_codes.sql",
  "utf8",
);
const schema = readFileSync("src/db/schema.ts", "utf8");
describe("independent backup code schema", () => {
  it("stores only per-code hashes independently from TOTP", () => {
    expect(migration).toContain("auth_backup_codes");
    expect(migration).toContain("code_hash");
    expect(migration).not.toContain("two_factor");
    expect(schema).toContain("authBackupCodes");
  });
});
