import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");
const schema = read("src/db/schema.ts");
const migration = read("drizzle/0065_portal_password_ciphertext.sql");

describe("Portal password ciphertext schema", () => {
  it("adds nullable ciphertext metadata while preserving hash", () => {
    expect(schema).toContain('portalPasswordHash: text("portal_password_hash")');
    expect(schema).toContain('portalPasswordCiphertext: text("portal_password_ciphertext")');
    expect(schema).toContain('portalPasswordNonce: text("portal_password_nonce")');
    expect(schema).toContain('portalPasswordEncryptionVersion: integer("portal_password_encryption_version")');
    expect(schema).toContain('portalPasswordEncryptedAt: timestamp("portal_password_encrypted_at"');
  });

  it("is additive, idempotent, and requires all-or-none encrypted fields", () => {
    expect(migration).not.toMatch(/\bDROP\b/i);
    expect(migration.match(/ADD COLUMN IF NOT EXISTS/g)?.length).toBe(4);
    expect(migration).toContain("clients_portal_password_ciphertext_complete_check");
    expect(migration).toContain("portal_password_hash");
  });
});
