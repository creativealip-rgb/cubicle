import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const server = readFileSync(new URL("../auth.ts", import.meta.url), "utf8");
const client = readFileSync(new URL("../auth-client.ts", import.meta.url), "utf8");

describe("mandatory MFA Better Auth wiring", () => {
  it("registers server twoFactor and passkey plugins", () => {
    expect(server).toMatch(/twoFactor\(\)/);
    expect(server).toMatch(/passkey\(/);
    expect(server).toMatch(/backupCodes/);
    expect(server).toMatch(/rpID|rpId/);
    expect(server).toMatch(/https:\/\/app\.cubiqlo\.com/);
  });

  it("registers client twoFactor and passkey plugins with challenge redirect", () => {
    expect(client).toMatch(/twoFactorClient\(\)/);
    expect(client).toMatch(/passkeyClient\(\)/);
    expect(client).toMatch(/\/two-factor/);
  });
});

it("adds Better Auth MFA tables to schema and migration", () => {
  const schema = readFileSync(new URL("../../db/schema.ts", import.meta.url), "utf8");
  const migration = readFileSync(new URL("../../../drizzle/0083_mandatory_mfa.sql", import.meta.url), "utf8");
  for (const name of ["twoFactor", "passkey", "backupCodes"]) expect(schema).toContain(name);
  expect(migration).toContain('CREATE TABLE IF NOT EXISTS "two_factor"');
  expect(migration).toContain('CREATE TABLE IF NOT EXISTS "passkey"');
});

it("keeps email OTP out of MFA plugin configuration", () => {
  expect(server).not.toMatch(/emailOTP\(/);
});

export {};
