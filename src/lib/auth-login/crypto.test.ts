import { describe, expect, it } from "vitest";
import { generateOtp, generateToken, hashVerifier, maskEmail, verifyVerifier, OTP_EXPIRY_MS, TRUSTED_DEVICE_EXPIRY_MS } from "@/lib/auth-login/crypto";

describe("auth login crypto", () => {
  it("generates six digit OTP and random token", () => { expect(generateOtp()).toMatch(/^\d{6}$/); expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{32,}$/); });
  it("uses secret-bound timing-safe verifier", () => { const hash = hashVerifier("code", "secret"); expect(verifyVerifier("code", hash, "secret")).toBe(true); expect(verifyVerifier("code", hash, "wrong")).toBe(false); });
  it("masks email and exposes required expiries", () => { expect(maskEmail("alice@example.com")).toBe("a***e@example.com"); expect(OTP_EXPIRY_MS).toBe(600000); expect(TRUSTED_DEVICE_EXPIRY_MS).toBe(2592000000); });
});
