import { describe, expect, it, vi } from "vitest";
import {
  INVALID_CREDENTIALS,
  isValidTrustedDevice,
  normalizeLoginEmail,
  parseTrustedCookie,
  runPasswordLoginStart,
  sanitizeCallbackUrl,
  validateLoginInput,
  type PasswordLoginDeps,
} from "./service";
import { hashVerifier } from "./crypto";

const now = new Date("2026-09-07T00:00:00Z");
function deps(overrides: Partial<PasswordLoginDeps> = {}): PasswordLoginDeps {
  return {
    enabled: true,
    secret: "test-secret-at-least-32-characters-long",
    now: () => now,
    rateLimit: vi.fn().mockResolvedValue(true),
    findCredential: vi
      .fn()
      .mockResolvedValue({
        userId: "u1",
        email: "user@example.com",
        passwordHash: "hash",
      }),
    verifyPassword: vi.fn().mockResolvedValue(true),
    verifyDummyPassword: vi.fn().mockResolvedValue(undefined),
    findTrustedDevice: vi.fn().mockResolvedValue(null),
    createSession: vi.fn().mockResolvedValue(undefined),
    replaceChallenge: vi.fn().mockResolvedValue(undefined),
    deleteChallenge: vi.fn().mockResolvedValue(undefined),
    sendOtp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("password email OTP login start", () => {
  it("normalizes input and sanitizes callback URL", () => {
    expect(normalizeLoginEmail("  USER@Example.COM ")).toBe("user@example.com");
    expect(validateLoginInput({ email: "bad", password: "x" }).ok).toBe(false);
    expect(sanitizeCallbackUrl("/app/tasks?x=1")).toBe("/app/tasks?x=1");
    expect(sanitizeCallbackUrl("https://evil.test")).toBe("/app/dashboard");
  });

  it("validates trusted device ownership and expiry", () => {
    expect(
      isValidTrustedDevice(
        {
          userId: "u1",
          deviceUserId: "u1",
          tokenValid: true,
          expiresAt: new Date("2026-09-08T00:00:00Z"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(true);
    expect(
      isValidTrustedDevice(
        {
          userId: "u1",
          deviceUserId: "u2",
          tokenValid: true,
          expiresAt: new Date("2026-09-08T00:00:00Z"),
          revokedAt: null,
        },
        now,
      ),
    ).toBe(false);
  });

  it("parses only opaque recordId.token cookies", () => {
    expect(
      parseTrustedCookie("550e8400-e29b-41d4-a716-446655440000.secret-token"),
    ).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      token: "secret-token",
    });
    expect(parseTrustedCookie("broken")).toBeNull();
  });

  it("returns identical invalid credentials for unknown user and wrong password", async () => {
    const unknown = deps({ findCredential: vi.fn().mockResolvedValue(null) });
    const wrong = deps({ verifyPassword: vi.fn().mockResolvedValue(false) });
    await expect(
      runPasswordLoginStart(
        { email: "user@example.com", password: "wrong" },
        unknown,
      ),
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      error: INVALID_CREDENTIALS,
    });
    await expect(
      runPasswordLoginStart(
        { email: "user@example.com", password: "wrong" },
        wrong,
      ),
    ).resolves.toEqual({
      ok: false,
      code: "INVALID_CREDENTIALS",
      error: INVALID_CREDENTIALS,
    });
    expect(unknown.verifyDummyPassword).toHaveBeenCalledOnce();
  });

  it("creates no session before OTP for untrusted browser", async () => {
    const d = deps();
    const result = await runPasswordLoginStart(
      { email: "user@example.com", password: "pw", callbackUrl: "/app/tasks" },
      d,
    );
    expect(result.ok && result.status).toBe("otp_required");
    expect(d.replaceChallenge).toHaveBeenCalledOnce();
    expect(d.sendOtp).toHaveBeenCalledOnce();
    expect(d.createSession).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toMatch(
      /userId|codeHash|"code"|tokenHash/i,
    );
  });

  it("creates session only after password and trusted-device validation", async () => {
    const d = deps({
      findTrustedDevice: vi
        .fn()
        .mockResolvedValue({
          userId: "u1",
          tokenHash: hashVerifier(
            "secret-token",
            "test-secret-at-least-32-characters-long",
          ),
          expiresAt: new Date("2026-10-01T00:00:00Z"),
          revokedAt: null,
        }),
    });
    const result = await runPasswordLoginStart(
      {
        email: "user@example.com",
        password: "pw",
        trustedCookie: "550e8400-e29b-41d4-a716-446655440000.secret-token",
        callbackUrl: "/app",
      },
      d,
    );
    expect(result).toEqual({
      ok: true,
      status: "authenticated",
      redirectTo: "/app",
    });
    expect(d.createSession).toHaveBeenCalledWith("u1");
  });

  it("cleans challenge when mail delivery fails", async () => {
    const d = deps({
      sendOtp: vi.fn().mockRejectedValue(new Error("mail unavailable")),
    });
    await expect(
      runPasswordLoginStart({ email: "user@example.com", password: "pw" }, d),
    ).resolves.toEqual({
      ok: false,
      code: "DELIVERY_FAILED",
      error: "Kode OTP gagal dikirim. Coba lagi.",
    });
    expect(d.deleteChallenge).toHaveBeenCalledOnce();
  });

  it("fails closed when disabled or rate limited", async () => {
    await expect(
      runPasswordLoginStart(
        { email: "user@example.com", password: "pw" },
        deps({ enabled: false }),
      ),
    ).resolves.toMatchObject({ ok: false, code: "DISABLED" });
    await expect(
      runPasswordLoginStart(
        { email: "user@example.com", password: "pw" },
        deps({ rateLimit: vi.fn().mockResolvedValue(false) }),
      ),
    ).resolves.toMatchObject({ ok: false, code: "RATE_LIMITED" });
  });
});
