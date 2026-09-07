import { describe, expect, it } from "vitest";
import { generateOtp, generateToken, hashVerifier, maskEmail, sha256, verifyVerifier, OTP_EXPIRY_MS, TRUSTED_DEVICE_EXPIRY_MS } from "@/lib/auth-login/crypto";

describe("auth login crypto", () => {
  it("generates six digit OTP and random token", () => { expect(generateOtp()).toMatch(/^\d{6}$/); expect(generateToken()).toMatch(/^[A-Za-z0-9_-]{32,}$/); });
  it("uses secret-bound timing-safe verifier", () => { const hash = hashVerifier("code", "secret"); expect(verifyVerifier("code", hash, "secret")).toBe(true); expect(verifyVerifier("code", hash, "wrong")).toBe(false); });
  it("rejects empty secrets and malformed verifiers without throwing", () => {
    expect(() => hashVerifier("code", "")).toThrow();
    expect(verifyVerifier("code", "not-hex", "secret")).toBe(false);
  });
  it("keeps OTP range and token uniqueness feasible", () => {
    const otps = Array.from({ length: 100 }, () => generateOtp());
    expect(otps.every((otp) => Number(otp) >= 0 && Number(otp) <= 999999)).toBe(true);
    expect(new Set(Array.from({ length: 20 }, generateToken)).size).toBe(20);
  });
  it("domain-separates verifier and hashes deterministically", () => {
    expect(hashVerifier("code", "secret")).not.toBe(sha256("code"));
    expect(sha256("value")).toBe(sha256("value"));
    expect(hashVerifier("code", "secret")).not.toBe(hashVerifier("other", "secret"));
  });
  it("masks email and exposes required expiries", () => { expect(maskEmail("alice@example.com")).toBe("a***e@example.com"); expect(OTP_EXPIRY_MS).toBe(600000); expect(TRUSTED_DEVICE_EXPIRY_MS).toBe(2592000000); });
  it("defensively masks malformed and short email input", () => { expect(maskEmail("alice")).toBe("***"); expect(maskEmail("@example.com")).toBe("***"); expect(maskEmail("a@b")).toBe("a***@b"); });
});
