import { describe, expect, it } from "vitest";

import {
  ABSOLUTE_SESSION_SECONDS,
  IDLE_SESSION_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
  capSessionExpiry,
} from "@/lib/auth-policy";

describe("auth session policy", () => {
  it("uses seven-day idle and 30-day absolute lifetimes", () => {
    expect(IDLE_SESSION_SECONDS).toBe(7 * 24 * 60 * 60);
    expect(ABSOLUTE_SESSION_SECONDS).toBe(30 * 24 * 60 * 60);
    expect(SESSION_UPDATE_AGE_SECONDS).toBe(24 * 60 * 60);
  });

  it("caps refreshed expiry at 30 days from session creation", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const requestedExpiry = new Date("2026-02-05T00:00:00.000Z");

    expect(capSessionExpiry(createdAt, requestedExpiry)).toEqual(
      new Date("2026-01-31T00:00:00.000Z"),
    );
  });

  it("keeps shorter idle expiry unchanged", () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z");
    const requestedExpiry = new Date("2026-01-08T00:00:00.000Z");

    expect(capSessionExpiry(createdAt, requestedExpiry)).toEqual(requestedExpiry);
  });
});
