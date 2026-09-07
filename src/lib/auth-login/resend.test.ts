import { describe, expect, it, vi } from "vitest";
import { runOtpResend, type OtpResendDeps } from "./resend";

const now = new Date("2026-09-07T00:00:00Z");
const deps = (overrides: Partial<OtpResendDeps> = {}): OtpResendDeps => ({
  now: () => now, rateLimit: vi.fn().mockResolvedValue(true),
  findChallenge: vi.fn().mockResolvedValue({ id: "c1", email: "u@example.com", resendAfter: new Date("2026-09-06T23:59:00Z"), consumedAt: null }),
  replaceCode: vi.fn().mockResolvedValue({ code: "123456", expiresAt: new Date("2026-09-07T00:10:00Z") }),
  sendOtp: vi.fn().mockResolvedValue(undefined), rollback: vi.fn().mockResolvedValue(undefined), ...overrides,
});
describe("OTP resend", () => {
  it("rejects cooldown and rate limit", async () => {
    await expect(runOtpResend("flow", deps({ findChallenge: vi.fn().mockResolvedValue({ id: "c1", email: "u@example.com", resendAfter: new Date("2026-09-07T00:01:00Z"), consumedAt: null }) }))).resolves.toMatchObject({ ok: false, code: "COOLDOWN" });
    await expect(runOtpResend("flow", deps({ rateLimit: vi.fn().mockResolvedValue(false) }))).resolves.toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
  it("replaces code and returns public expiry", async () => {
    const d = deps(); await expect(runOtpResend("flow", d)).resolves.toEqual({ ok: true, expiresAt: "2026-09-07T00:10:00.000Z" });
    expect(d.replaceCode).toHaveBeenCalledWith("c1"); expect(d.sendOtp).toHaveBeenCalledOnce();
  });
  it("rolls back replacement on delivery failure", async () => {
    const d = deps({ sendOtp: vi.fn().mockRejectedValue(new Error("mail")) });
    await expect(runOtpResend("flow", d)).resolves.toMatchObject({ ok: false, code: "DELIVERY_FAILED" }); expect(d.rollback).toHaveBeenCalledWith("c1");
  });
});
