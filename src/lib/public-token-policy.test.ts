import { describe, expect, it } from "vitest";
import {
  PublicTokenError,
  assertPublicTokenLifecycle,
} from "@/lib/public-token-policy";

const now = new Date("2026-07-25T12:00:00.000Z");
const base = {
  presentedHash: "hash-a",
  storedHash: "hash-a",
  enabled: true,
  revokedAt: null,
  expiresAt: new Date("2026-07-26T12:00:00.000Z"),
  status: "sent",
  allowedStatuses: ["sent", "viewed"],
  processedStatuses: ["accepted", "signed", "declined"],
  now,
};

function expectCode(input: Partial<typeof base>, code: string) {
  try {
    assertPublicTokenLifecycle({ ...base, ...input });
    throw new Error("expected policy rejection");
  } catch (error) {
    expect(error).toBeInstanceOf(PublicTokenError);
    expect((error as PublicTokenError).code).toBe(code);
  }
}

describe("public token lifecycle policy", () => {
  it("accepts enabled, matching, active token in allowed state", () => {
    expect(assertPublicTokenLifecycle(base)).toEqual({ ok: true });
  });

  it("rejects wrong-resource token hash", () => {
    expectCode({ presentedHash: "hash-b" }, "invalid");
  });

  it("rejects disabled links", () => {
    expectCode({ enabled: false }, "disabled");
  });

  it("rejects revoked links", () => {
    expectCode({ revokedAt: new Date("2026-07-24T12:00:00.000Z") }, "revoked");
  });

  it("rejects expiry at exact boundary", () => {
    expectCode({ expiresAt: now }, "expired");
  });

  it("identifies already-processed lifecycle", () => {
    expectCode({ status: "accepted" }, "processed");
  });

  it("rejects status not allowed for public operation", () => {
    expectCode({ status: "draft" }, "unavailable");
  });
});
