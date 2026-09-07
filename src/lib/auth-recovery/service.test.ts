import { describe, expect, it, vi } from "vitest";
import { hashVerifier } from "@/lib/auth-login/crypto";
import { redeemRecoveryHandoff, type RecoveryDeps } from "./service";
const secret = "12345678901234567890123456789012",
  now = new Date("2026-09-07T00:00:00Z"),
  token = "recovery-token";
const deps = (overrides: Partial<RecoveryDeps> = {}): RecoveryDeps => ({
  now: () => now,
  secret,
  findHandoff: vi
    .fn()
    .mockResolvedValue({
      id: "h1",
      userId: "u1",
      tokenHash: hashVerifier(`recovery-handoff:${token}`, secret),
      expiresAt: new Date("2026-09-07T00:15:00Z"),
      consumedAt: null,
    }),
  consume: vi.fn().mockResolvedValue(true),
  revokeOldAuth: vi.fn(),
  createSession: vi.fn().mockResolvedValue("s1"),
  createTrustedDevice: vi.fn().mockResolvedValue("d1.t1"),
  createAuthorization: vi.fn(),
  ...overrides,
});
describe("recovery handoff", () => {
  it("rejects expired, invalid, and replayed token", async () => {
    for (const o of [
      { findHandoff: vi.fn().mockResolvedValue(null) },
      {
        findHandoff: vi
          .fn()
          .mockResolvedValue({
            id: "h",
            userId: "u",
            tokenHash: "bad",
            expiresAt: new Date("2026-09-07T00:15:00Z"),
            consumedAt: null,
          }),
      },
      { consume: vi.fn().mockResolvedValue(false) },
    ])
      expect(await redeemRecoveryHandoff(token, deps(o))).toEqual({
        ok: false,
      });
  });
  it("atomically consumes then revokes and authorizes exact session", async () => {
    const d = deps();
    expect(await redeemRecoveryHandoff(token, d)).toEqual({
      ok: true,
      sessionId: "s1",
      trustedCookie: "d1.t1",
    });
    expect(d.consume).toHaveBeenCalledWith("h1");
    expect(d.revokeOldAuth).toHaveBeenCalledWith("u1");
    expect(d.createAuthorization).toHaveBeenCalledWith("u1", "s1");
  });
});
