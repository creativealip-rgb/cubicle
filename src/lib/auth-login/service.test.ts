import { describe, expect, it } from "vitest";
import { normalizeLoginEmail, isValidTrustedDevice, validateLoginInput, sanitizeCallbackUrl, isTrustedCookie } from "./service";

describe("password email OTP login service", () => {
  it("normalizes email and rejects malformed credentials", () => {
    expect(normalizeLoginEmail("  USER@Example.COM ")).toBe("user@example.com");
    expect(validateLoginInput({ email: "bad", password: "x" }).ok).toBe(false);
    expect(validateLoginInput({ email: "user@example.com", password: "secret" }).ok).toBe(true);
  });

  it("accepts trusted device only for matching active owner and verifier", () => {
    const now = new Date("2026-09-07T00:00:00Z");
    expect(isValidTrustedDevice({ userId: "u1", deviceUserId: "u1", tokenValid: true, expiresAt: new Date("2026-09-08T00:00:00Z"), revokedAt: null }, now)).toBe(true);
    expect(isValidTrustedDevice({ userId: "u1", deviceUserId: "u2", tokenValid: true, expiresAt: new Date("2026-09-08T00:00:00Z"), revokedAt: null }, now)).toBe(false);
    expect(isValidTrustedDevice({ userId: "u1", deviceUserId: "u1", tokenValid: true, expiresAt: new Date("2026-09-06T00:00:00Z"), revokedAt: null }, now)).toBe(false);
  });
});
