import { describe, expect, it } from "vitest";
import {
  findPersonalSiteByEffectiveSlug,
  getRecordEffectiveSlug,
  hasEffectiveSlugCollision,
  type PersonalSiteSlugRecord,
} from "./slug-records";

const future = "2099-01-01T00:00:00.000Z";
const row = (overrides: Partial<PersonalSiteSlugRecord> = {}): PersonalSiteSlugRecord => ({
  id: "site-1",
  workspaceId: "workspace-1",
  slug: "custom-site",
  published: true,
  plan: "solo",
  planExpiresAt: future,
  workspaceSlug: "workspace-site",
  ...overrides,
});

describe("personal-site effective slug records", () => {
  it("resolves paid custom and downgraded workspace slugs", () => {
    expect(getRecordEffectiveSlug(row())).toBe("custom-site");
    expect(getRecordEffectiveSlug(row({ plan: "free" }))).toBe("workspace-site");
  });

  it("finds only exact normalized effective slugs", () => {
    const rows = [row({ plan: "free" })];
    expect(findPersonalSiteByEffectiveSlug(rows, "workspace-site")?.id).toBe("site-1");
    expect(findPersonalSiteByEffectiveSlug(rows, "custom-site")).toBeUndefined();
    expect(findPersonalSiteByEffectiveSlug(rows, " Workspace-Site ")).toBeUndefined();
  });

  it("filters unpublished rows for public lookup", () => {
    const rows = [row({ published: false })];
    expect(findPersonalSiteByEffectiveSlug(rows, "custom-site", { publishedOnly: true })).toBeUndefined();
    expect(findPersonalSiteByEffectiveSlug(rows, "custom-site")?.id).toBe("site-1");
  });

  it("detects collisions while excluding current site", () => {
    const rows = [row(), row({ id: "site-2", workspaceId: "workspace-2", slug: "other", workspaceSlug: "other" })];
    expect(hasEffectiveSlugCollision(rows, "custom-site")).toBe(true);
    expect(hasEffectiveSlugCollision(rows, "custom-site", "site-1")).toBe(false);
  });
});
