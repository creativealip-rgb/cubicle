import { describe, expect, it } from "vitest";
import { getAiEntitlementFailure, getEffectivePlan, getPlanLimits } from "./plan";

describe("plan entitlements", () => {
  it("keeps active paid plan before expiry", () => {
    expect(getEffectivePlan("solo", new Date("2027-01-01T00:00:00Z"), new Date("2026-01-01T00:00:00Z"))).toBe("solo");
  });

  it("keeps paid plan during 3 day grace", () => {
    expect(getEffectivePlan("solo", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-03T23:59:59Z"))).toBe("solo");
  });

  it("downgrades paid plan after grace", () => {
    expect(getEffectivePlan("team", new Date("2026-01-01T00:00:00Z"), new Date("2026-01-05T00:00:00Z"))).toBe("free");
  });

  it("keeps free as free", () => {
    expect(getEffectivePlan("free", null, new Date("2026-01-01T00:00:00Z"))).toBe("free");
  });

  it("matches source-of-truth limits", () => {
    expect(getPlanLimits("free")).toMatchObject({
      maxWorkspaces: 1,
      maxMembers: 1,
      canInviteMembers: false,
      hasClientPortal: true,
      hasAiAssistant: true,
      aiRequestsPerMonth: 10,
      apiRequestsPerMinute: 30,
      maxClients: 3,
      maxProjects: 5,
      maxInvoicesPerMonth: 10,
      maxFileSizeMb: 5,
    });
    expect(getPlanLimits("solo")).toMatchObject({
      maxWorkspaces: 3,
      maxMembers: 1,
      canInviteMembers: false,
      hasClientPortal: true,
      hasAiAssistant: true,
      aiRequestsPerMonth: 100,
      apiRequestsPerMinute: 120,
      maxFileSizeMb: 25,
    });
    expect(getPlanLimits("team")).toMatchObject({
      maxWorkspaces: 0,
      maxMembers: 0,
      canInviteMembers: true,
      hasClientPortal: true,
      hasAiAssistant: true,
      aiRequestsPerMonth: 1000,
      apiRequestsPerMinute: 0,
      maxFileSizeMb: 50,
    });
  });

  it("allows AI entitlement for all tiers", () => {
    expect(getAiEntitlementFailure("free")).toBeNull();
    expect(getAiEntitlementFailure("solo")).toBeNull();
    expect(getAiEntitlementFailure("team")).toBeNull();
  });
});
