import { describe, expect, it, vi } from "vitest";
import {
  revokeAllAuthState,
  revokeCurrentAuthState,
  type RevocationDeps,
} from "./revocation";

const deps = (overrides: Partial<RevocationDeps> = {}): RevocationDeps => ({
  revokeSessions: vi.fn(),
  revokeTrustedDevices: vi.fn(),
  consumeChallenges: vi.fn(),
  revokeRecovery: vi.fn(),
  ...overrides,
});
describe("auth state revocation", () => {
  it("logout current revokes current session and trusted device", async () => {
    const d = deps();
    await revokeCurrentAuthState("u1", "s1", "d1", d);
    expect(d.revokeSessions).toHaveBeenCalledWith("u1", "s1");
    expect(d.revokeTrustedDevices).toHaveBeenCalledWith("u1", "d1");
  });
  it("logout all and password changes revoke every auth state", async () => {
    const d = deps();
    await revokeAllAuthState("u1", d);
    expect(d.revokeSessions).toHaveBeenCalledWith("u1");
    expect(d.revokeTrustedDevices).toHaveBeenCalledWith("u1");
    expect(d.consumeChallenges).toHaveBeenCalledWith("u1");
    expect(d.revokeRecovery).toHaveBeenCalledWith("u1");
  });
});
