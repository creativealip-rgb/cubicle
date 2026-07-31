import { describe, expect, it } from "vitest";
import { decryptPortalPassword, encryptPortalPassword } from "./portal-password-encryption";

const KEY = Buffer.alloc(32, 7).toString("base64");
const OTHER_KEY = Buffer.alloc(32, 8).toString("base64");

describe("Portal password encryption", () => {
  it("round trips without exposing plaintext", () => {
    const encrypted = encryptPortalPassword("Rahasia123!", KEY);
    expect(decryptPortalPassword(encrypted, KEY)).toBe("Rahasia123!");
    expect(encrypted.ciphertext).not.toContain("Rahasia123!");
    expect(encrypted.version).toBe(1);
  });

  it("uses a random nonce", () => {
    expect(encryptPortalPassword("same", KEY)).not.toEqual(encryptPortalPassword("same", KEY));
  });

  it("fails closed for wrong keys and tampering", () => {
    const encrypted = encryptPortalPassword("secret", KEY);
    expect(() => decryptPortalPassword(encrypted, OTHER_KEY)).toThrow();
    expect(() => decryptPortalPassword({ ...encrypted, ciphertext: `${encrypted.ciphertext.slice(0, -2)}AA` }, KEY)).toThrow();
  });

  it.each(["", "short", Buffer.alloc(31).toString("base64"), "not-base64***"])("rejects invalid key %s", (key) => {
    expect(() => encryptPortalPassword("secret", key)).toThrow("PORTAL_PASSWORD_ENCRYPTION_KEY");
  });

  it("rejects unsupported versions", () => {
    const encrypted = encryptPortalPassword("secret", KEY);
    expect(() => decryptPortalPassword({ ...encrypted, version: 2 }, KEY)).toThrow(/versi/i);
  });
});
