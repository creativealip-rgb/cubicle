import { describe, expect, it, vi } from "vitest";
import { hashVerifier } from "./crypto";
import { runOtpVerify, type OtpVerifyDeps } from "./verify";

const secret = "test-secret-at-least-32-characters-long";
const now = new Date("2026-09-07T00:00:00Z");
const base = (overrides: Partial<OtpVerifyDeps> = {}): OtpVerifyDeps => ({
  secret, now: () => now, rateLimit: vi.fn().mockResolvedValue(true),
  lockChallenge: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", codeHash: hashVerifier("123456", secret), attempts: 0, expiresAt: new Date("2026-09-07T00:10:00Z"), consumedAt: null }),
  failAttempt: vi.fn().mockResolvedValue(undefined), consume: vi.fn().mockResolvedValue(true),
  createSession: vi.fn().mockResolvedValue(undefined), createTrustedDevice: vi.fn().mockResolvedValue({ id: "550e8400-e29b-41d4-a716-446655440000", token: "trusted-secret" }), ...overrides,
});

describe("OTP verification", () => {
  it("rejects malformed and rate-limited requests", async () => {
    await expect(runOtpVerify("flow", "12", base())).resolves.toMatchObject({ ok: false, code: "INVALID_OTP" });
    await expect(runOtpVerify("flow", "123456", base({ rateLimit: vi.fn().mockResolvedValue(false) }))).resolves.toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
  it("rejects expired, consumed, and exhausted challenges", async () => {
    for (const patch of [{ expiresAt: now }, { consumedAt: now }, { attempts: 5 }]) {
      const d = base({ lockChallenge: vi.fn().mockResolvedValue({ id: "c1", userId: "u1", codeHash: hashVerifier("123456", secret), attempts: 0, expiresAt: new Date("2026-09-07T00:10:00Z"), consumedAt: null, ...patch }) });
      await expect(runOtpVerify("flow", "123456", d)).resolves.toMatchObject({ ok: false, code: "INVALID_OTP" });
      expect(d.createSession).not.toHaveBeenCalled();
    }
  });
  it("increments failed attempt without creating session", async () => {
    const d = base(); await expect(runOtpVerify("flow", "999999", d)).resolves.toMatchObject({ ok: false, code: "INVALID_OTP" });
    expect(d.failAttempt).toHaveBeenCalledWith("c1"); expect(d.createSession).not.toHaveBeenCalled();
  });
  it("atomically consumes once then creates session and trusted device", async () => {
    const d = base(); const result = await runOtpVerify("flow", "123456", d);
    expect(d.consume).toHaveBeenCalledWith("c1"); expect(d.createSession).toHaveBeenCalledWith("u1");
    expect(result).toEqual({ ok: true, status: "authenticated", trustedCookie: "550e8400-e29b-41d4-a716-446655440000.trusted-secret" });
  });
  it("does not create session when concurrent consume loses", async () => {
    const d = base({ consume: vi.fn().mockResolvedValue(false) });
    await expect(runOtpVerify("flow", "123456", d)).resolves.toMatchObject({ ok: false, code: "INVALID_OTP" });
    expect(d.createSession).not.toHaveBeenCalled();
  });
});
