import { describe, expect, it } from "vitest";
import { resolveClientPortalPasswordState } from "./client-portal-status";

describe("Client Portal password state", () => {
  it("distinguishes none, legacy, and revealable", () => {
    expect(resolveClientPortalPasswordState({ portalEnabled: false, portalPasswordHash: null, portalPasswordCiphertext: null })).toBe("none");
    expect(resolveClientPortalPasswordState({ portalEnabled: true, portalPasswordHash: "hash", portalPasswordCiphertext: null })).toBe("legacy");
    expect(resolveClientPortalPasswordState({ portalEnabled: true, portalPasswordHash: "hash", portalPasswordCiphertext: "cipher" })).toBe("revealable");
  });
  it("never reports revealable without hash and enabled Portal", () => {
    expect(resolveClientPortalPasswordState({ portalEnabled: true, portalPasswordHash: null, portalPasswordCiphertext: "cipher" })).toBe("none");
    expect(resolveClientPortalPasswordState({ portalEnabled: false, portalPasswordHash: "hash", portalPasswordCiphertext: "cipher" })).toBe("none");
  });
});
