import { describe, expect, it } from "vitest";
import {
  canEditPersonalSiteSlug,
  getEffectivePersonalSiteSlug,
  matchesPersonalSiteSlug,
} from "./slug-policy";

describe("personal-site slug policy", () => {
  it("always uses normalized workspace slug on free", () => {
    expect(getEffectivePersonalSiteSlug("free", " Acme Workspace ", "saved-custom")).toBe("acme-workspace");
    expect(canEditPersonalSiteSlug("free")).toBe(false);
  });

  it("uses normalized custom slug on paid plans", () => {
    expect(getEffectivePersonalSiteSlug("solo", "Acme", " My Custom Site ")).toBe("my-custom-site");
    expect(getEffectivePersonalSiteSlug("team", "Acme", "Team.Site")).toBe("team-site");
    expect(canEditPersonalSiteSlug("solo")).toBe(true);
    expect(canEditPersonalSiteSlug("team")).toBe(true);
  });

  it("falls back to normalized workspace slug for empty custom slug", () => {
    expect(getEffectivePersonalSiteSlug("solo", " Acme Workspace ", "   ")).toBe("acme-workspace");
  });

  it("matches only effective slug, so downgraded old custom URL stops matching", () => {
    expect(matchesPersonalSiteSlug("free", "Acme Workspace", "old-custom", "old-custom")).toBe(false);
    expect(matchesPersonalSiteSlug("free", "Acme Workspace", "old-custom", "acme-workspace")).toBe(true);
  });

  it("normalizes request slug before policy comparison", () => {
    expect(matchesPersonalSiteSlug("team", "Acme", "My Site", " MY-SITE ")).toBe(true);
  });
});

// Keep plan-expiry resolution outside this pure policy; callers pass getEffectivePlan result.
