import { describe, expect, it } from "vitest";
import { createPortalSession, verifyPortalSession } from "./portal-password";

describe("portal password session", () => {
  it("accepts a valid client/version-bound session", () => {
    const token = createPortalSession("client-1", "version-1", "secret", 1_000);
    expect(verifyPortalSession(token, "client-1", "version-1", "secret", 1_001)?.clientId).toBe("client-1");
  });

  it("rejects wrong client, version, signature, and expiry", () => {
    const token = createPortalSession("client-1", "version-1", "secret", 1_000);
    expect(verifyPortalSession(token, "client-2", "version-1", "secret", 1_001)).toBeNull();
    expect(verifyPortalSession(token, "client-1", "version-2", "secret", 1_001)).toBeNull();
    expect(verifyPortalSession(`${token}x`, "client-1", "version-1", "secret", 1_001)).toBeNull();
    expect(verifyPortalSession(token, "client-1", "version-1", "secret", 1_000 + 60 * 60 * 25)).toBeNull();
  });
});
