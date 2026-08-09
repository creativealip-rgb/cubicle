import { describe, expect, it } from "vitest";
import {
  PORTAL_SLUG_FALLBACK_BASE,
  PORTAL_SLUG_MAX_LENGTH,
  buildPortalSlugCandidates,
  portalSlugBase,
  slugifyPortalSlug,
} from "./portal-slug";

describe("slugifyPortalSlug", () => {
  it("lowercases, trims, and replaces non-alphanumerics with hyphens", () => {
    expect(slugifyPortalSlug("Kopi Senja!")).toBe("kopi-senja");
    expect(slugifyPortalSlug("  PT. Maju   Bersama  ")).toBe("pt-maju-bersama");
  });

  it("strips leading/trailing hyphens", () => {
    expect(slugifyPortalSlug("-kopi-")).toBe("kopi");
  });

  it("caps length at 60 (schema max)", () => {
    const long = "a".repeat(100);
    const slug = slugifyPortalSlug(long);
    expect(slug.length).toBe(PORTAL_SLUG_MAX_LENGTH);
    expect(slug).toBe("a".repeat(60));
  });

  it("returns empty string for empty/blank input", () => {
    expect(slugifyPortalSlug("")).toBe("");
    expect(slugifyPortalSlug("   ")).toBe("");
    expect(slugifyPortalSlug("!!!")).toBe("");
  });
});

describe("portalSlugBase", () => {
  it("falls back to a stable base when slugified input is too short or empty", () => {
    expect(portalSlugBase("")).toBe(PORTAL_SLUG_FALLBACK_BASE);
    expect(portalSlugBase("ab")).toBe(PORTAL_SLUG_FALLBACK_BASE); // below min length 3
    expect(portalSlugBase("!!")).toBe(PORTAL_SLUG_FALLBACK_BASE);
  });

  it("keeps a valid slugified base", () => {
    expect(portalSlugBase("Kopi Senja")).toBe("kopi-senja");
    expect(portalSlugBase("abc")).toBe("abc");
  });
});

describe("buildPortalSlugCandidates", () => {
  it("starts with the bare base then deterministic numeric suffixes", () => {
    expect(buildPortalSlugCandidates("kopi-senja", 3)).toEqual([
      "kopi-senja",
      "kopi-senja-2",
      "kopi-senja-3",
      "kopi-senja-4",
    ]);
  });

  it("generates unique candidates", () => {
    const candidates = buildPortalSlugCandidates("kopi-senja", 20);
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it("keeps suffixed candidates within the 60-char limit by truncating the head", () => {
    const base = "x".repeat(PORTAL_SLUG_MAX_LENGTH);
    for (const candidate of buildPortalSlugCandidates(base, 5)) {
      expect(candidate.length).toBeLessThanOrEqual(PORTAL_SLUG_MAX_LENGTH);
    }
    // base itself is capped
    expect(buildPortalSlugCandidates(base, 1)[0].length).toBe(PORTAL_SLUG_MAX_LENGTH);
    // suffixed candidate truncates head to fit "-2"
    const suffixed = buildPortalSlugCandidates(base, 1)[1];
    expect(suffixed).toBe(`${"x".repeat(PORTAL_SLUG_MAX_LENGTH - 2)}-2`);
  });

  it("never emits empty candidates even for blank input (fallback base)", () => {
    for (const candidate of buildPortalSlugCandidates("", 3)) {
      expect(candidate.length).toBeGreaterThan(0);
    }
  });
});
