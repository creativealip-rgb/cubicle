/**
 * Focused tests for the readiness badge helper (Phase 6 UI integration).
 * Pure function — no React rendering required.
 */
import { describe, expect, it } from "vitest";
import { computeReadinessPreview } from "./readiness-badge";
import type { PersonalSiteInput } from "@/lib/personal-site/model";
import { DEFAULT_PERSONAL_SITE } from "@/lib/personal-site/model";

const createThemeConfig = () => ({
  primaryColor: "#6647F0",
  secondaryColor: "#1e293b",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  headerStyle: "full-width" as const,
  buttonStyle: "rounded" as const,
});

describe("computeReadinessPreview", () => {
  it("returns ready=true for complete site with errors=0 warnings=0", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "my-alip-studio",
      title: "Alip Digital Studio",
      hero: "Membantu bisnis tampil profesional dan siap menerima klien baru.",
      ctaLabel: "Konsultasi Gratis",
      ctaUrl: "https://wa.me/62812345678",
      published: true,
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: [
            {
              id: "services-1",
              type: "services",
              heading: "Layanan Kami",
              items: [{ id: "srv-1", title: "Web Design", description: "Desain website modern." }],
            },
          ],
        },
      ],
      themeConfig: createThemeConfig(),
    };

    const preview = computeReadinessPreview(site);
    expect(preview.ready).toBe(true);
    expect(preview.errors).toBe(0);
    expect(preview.warnings).toBe(0);
  });

  it("returns ready=false when there are errors", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "",
      title: "",
      hero: "",
      published: false,
    };
    delete (site as any).pages;

    const preview = computeReadinessPreview(site);
    expect(preview.ready).toBe(false);
    expect(preview.errors).toBeGreaterThan(0);
  });

  it("returns ready=true when only warnings exist", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "short",
      title: "A".repeat(101), // Too long but warning not error
      hero: "B".repeat(501), // Too long but warning not error
      published: false,
    };
    delete (site as any).pages;

    const preview = computeReadinessPreview(site);
    // Only warnings should be present, ready should still be true
    expect(preview.ready).toBe(true);
    expect(preview.errors).toBe(0);
    expect(preview.warnings).toBeGreaterThan(0);
  });

  it("includes all issues in preview.issues array", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "",
      title: "",
      published: false,
    };
    delete (site as any).pages;

    const preview = computeReadinessPreview(site);
    expect(preview.issues.length).toBeGreaterThan(0);
    expect(preview.issues.some((i) => i.id === "slug-empty")).toBe(true);
    expect(preview.issues.some((i) => i.id === "title-empty")).toBe(true);
  });

  it("never crashes on nullish/undefined fields", () => {
    expect(() =>
      computeReadinessPreview({
        ...DEFAULT_PERSONAL_SITE,
        slug: null as unknown as string,
        title: undefined as unknown as string,
        hero: null as unknown as string,
      })
    ).not.toThrow();

    expect(() =>
      computeReadinessPreview({
        ...DEFAULT_PERSONAL_SITE,
        pages: undefined as unknown as PersonalSiteInput["pages"],
        themeConfig: null as unknown as NonNullable<PersonalSiteInput["themeConfig"]>,
      })
    ).not.toThrow();
  });

  it("computes correctly for multi-page site with content on one page", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "multi-page",
      title: "Multi Page Studio",
      hero: "Hero text",
      ctaLabel: "Hubungi",
      ctaUrl: "https://wa.me/62812345678",
      published: true,
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: [],
        },
        {
          id: "about",
          slug: "about",
          title: "Tentang",
          isHome: false,
          sections: [
            {
              id: "about-text",
              type: "custom",
              heading: "About Section",
              content: "We are a digital studio.",
            },
          ],
        },
      ],
      themeConfig: createThemeConfig(),
    };

    const preview = computeReadinessPreview(site);
    expect(preview.ready).toBe(true);
    expect(preview.errors).toBe(0);
    expect(preview.warnings).toBe(0);
  });
});
