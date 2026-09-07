import { describe, expect, it } from "vitest";
import { advanceLogin, type LoginState } from "@/lib/auth-login/state-machine";
import { OTP_EXPIRY_MS } from "@/lib/auth-login/crypto";

describe("password email OTP login state machine", () => {
  it("keeps password pending until OTP succeeds", () => {
    const state: LoginState = { status: "password_pending", userId: "u1" };
    expect(advanceLogin(state, { type: "password_verified", trusted: false }, new Date("2026-01-01T00:00:00Z"))).toEqual({ status: "otp_pending", userId: "u1", expiresAt: "2026-01-01T00:10:00.000Z" });
  });
  it("bypasses OTP for valid trusted device", () => {
    const state: LoginState = { status: "password_pending", userId: "u1" };
    expect(advanceLogin(state, { type: "password_verified", trusted: true }, new Date("2026-01-01T00:00:00Z"))).toEqual({ status: "authenticated", userId: "u1" });
  });
  it("authenticates valid OTP and rejects expired OTP", () => {
    const state: LoginState = { status: "otp_pending", userId: "u1", expiresAt: "2026-01-01T00:10:00.000Z" };
    expect(advanceLogin(state, { type: "otp_verified" }, new Date("2026-01-01T00:09:59Z"))).toEqual({ status: "authenticated", userId: "u1" });
    expect(advanceLogin(state, { type: "otp_verified" }, new Date("2026-01-01T00:10:00Z"))).toEqual({ status: "password_pending", userId: "u1" });
  });
  it("does not enforce legacy twoFactorEnabled", () => {
    const state: LoginState = { status: "password_pending", userId: "u1" };
    expect(advanceLogin(state, { type: "password_verified", trusted: false, twoFactorEnabled: true }, new Date("2026-01-01T00:00:00Z")).status).toBe("otp_pending");
  });
  it("uses shared OTP expiry contract", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(advanceLogin({ status: "password_pending", userId: "u1" }, { type: "password_verified", trusted: false }, now)).toMatchObject({ expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS).toISOString() });
  });
});
