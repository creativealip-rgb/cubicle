import { describe, expect, it } from "vitest";
import { getPersonalSiteReadiness, isReadyToPublish, countReadinessIssues } from "./readiness";
import { DEFAULT_PERSONAL_SITE, type ThemeConfig } from "./model";

const createThemeConfig = (): ThemeConfig => ({
  primaryColor: "#6647F0",
  secondaryColor: "#1e293b",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  headerStyle: "full-width",
  buttonStyle: "rounded",
});

describe("getPersonalSiteReadiness", () => {
  it("returns empty issues for complete ready site with themeConfig and content", () => {
    const site = {
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
              type: "services" as const,
              heading: "Layanan Kami",
              items: [{ id: "srv-1", title: "Web Design", description: "Desain website modern dan responsif." }],
            },
          ],
        },
      ],
      themeConfig: createThemeConfig(),
    };

    const issues = getPersonalSiteReadiness(site);
    // Only warnings allowed when published
    const errors = issues.filter((i) => i.severity === "error");
    expect(errors).toHaveLength(0);
  });

  it("reports no errors for the default site (top-level sections render via fallback)", () => {
    const issues = getPersonalSiteReadiness(DEFAULT_PERSONAL_SITE);

    // The default site has a home page with empty sections; the renderer
    // falls back to site.sections, which carry content — so readiness must
    // not produce errors or false no-content warnings.
    expect(issues.some((i) => i.severity === "error")).toBe(false);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(false);
    expect(issues.some((i) => i.id === "no-pages")).toBe(false);
    expect(issues.some((i) => i.id === "theme-config-missing")).toBe(false); // default has themeConfig
  });

  it("flags empty or missing title", () => {
    const base = {
      ...DEFAULT_PERSONAL_SITE,
      title: "",
      published: false,
    };
    delete (base as any).pages;

    const issues = getPersonalSiteReadiness(base as any);
    expect(issues.some((i) => i.id === "title-empty")).toBe(true);
  });

  it("flags empty or missing hero", () => {
    const base = {
      ...DEFAULT_PERSONAL_SITE,
      hero: "",
      published: false,
    };
    delete (base as any).pages;

    const issues = getPersonalSiteReadiness(base as any);
    expect(issues.some((i) => i.id === "hero-empty")).toBe(true);
  });

  it("flags reserved slugs like 'preview' or 'admin'", () => {
    const reservedSlugs = ["preview", "new", "edit", "admin", "api"];
    for (const slug of reservedSlugs) {
      const issues = getPersonalSiteReadiness({
        ...DEFAULT_PERSONAL_SITE,
        slug,
        published: false,
        title: "Test",
        hero: "Test hero",
      });
      expect(issues.some((i) => i.id === "slug-reserved")).toBe(true);
    }
  });

  it("flags invalid slug pattern (uppercase, spaces)", () => {
    const invalidPatterns = ["Bad Slug", "MyStudio", "bad_slug", "a"];
    for (const slug of invalidPatterns) {
      const issues = getPersonalSiteReadiness({
        ...DEFAULT_PERSONAL_SITE,
        slug,
        published: false,
        title: "Test",
        hero: "Test hero",
      });
      if (slug.length >= 2 && slug.length <= 48) {
        expect(issues.some((i) => i.id === "slug-pattern")).toBe(true);
      } else if (slug.length < 2) {
        expect(issues.some((i) => i.id === "slug-length")).toBe(true);
      }
    }
  });

  it("pairs CTA label+URL together when published", () => {
    // Has label but no URL
    const siteWithoutUrl = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "ready-site",
      title: "Test Studio",
      hero: "Hero text here",
      published: true,
      ctaLabel: "Hubungi Saya",
      ctaUrl: "",
      pages: [DEFAULT_PERSONAL_SITE.pages![0]],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    let issues = getPersonalSiteReadiness(siteWithoutUrl);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(true);

    // Has URL but no label
    const siteWithoutLabel = {
      ...siteWithoutUrl,
      ctaLabel: "",
      ctaUrl: "https://example.com/contact",
    };

    issues = getPersonalSiteReadiness(siteWithoutLabel);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(true);

    // Both present - should be OK
    const siteWithBoth = {
      ...siteWithoutLabel,
      ctaLabel: "Hubungi Saya",
    };

    issues = getPersonalSiteReadiness(siteWithBoth);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false);
  });

  it("validates unsafe CTA URL protocol when label+URL are present", () => {
    const siteUnsafeUrl = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "unsafe-cta",
      title: "Test Studio",
      hero: "Hero text",
      published: true,
      ctaLabel: "Contact Me",
      ctaUrl: "javascript:alert('xss')",
      pages: [DEFAULT_PERSONAL_SITE.pages![0]],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteUnsafeUrl);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false); // paired correctly
    expect(issues.some((i) => i.id === "cta-url-invalid")).toBe(true);
  });

  it("requires at least one contact link or CTA URL when published", () => {
    // No contacts anywhere
    const siteNoContact = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "no-contact",
      title: "Test",
      hero: "Test hero",
      published: true,
      ctaLabel: "Get Started",
      ctaUrl: "https://example.com/start",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "empty-section",
              type: "services" as const,
              heading: "Empty Services",
              items: [],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    let issues = getPersonalSiteReadiness(siteNoContact);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false); // paired correctly

    // A valid top-level CTA URL satisfies the contact requirement on its own
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);

    // Truly no contact anywhere: no CTA, no links, no contact/social sections
    const siteTrulyNoContact = {
      ...siteNoContact,
      ctaLabel: "",
      ctaUrl: "",
      links: [],
    };

    issues = getPersonalSiteReadiness(siteTrulyNoContact);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false); // both absent, not unpaired
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(true);

    // Adding a legitimate contact URL clears the warning
    const siteWithContact = {
      ...siteTrulyNoContact,
      ctaLabel: "Let's Talk",
      ctaUrl: "mailto:hello@example.com",
    };

    issues = getPersonalSiteReadiness(siteWithContact);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false);
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);
  });

  it("requires at least one content-bearing section across pages", () => {
    // All page sections AND top-level sections are empty, so nothing renders
    // anywhere — readiness must warn (renderer would show no sections).
    const siteEmptySections = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "empty-content",
      title: "Test Site",
      hero: "Test Hero",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      sections: [],
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "empty-services",
              type: "services" as const,
              heading: "Services",
              items: [],
            },
            {
              id: "empty-process",
              type: "process" as const,
              heading: "Process",
              steps: [],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteEmptySections);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(true);
  });

  it("uses top-level sections for content check when pages are absent (legacy site)", () => {
    // Renderer: pages-less sites render site.sections directly, so readiness
    // must not warn when top-level sections carry content.
    const legacySite = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "legacy-site",
      title: "Legacy Studio",
      hero: "Hero text",
      published: false,
      pages: undefined as unknown as typeof DEFAULT_PERSONAL_SITE.pages,
      // DEFAULT_PERSONAL_SITE.sections already contains content-bearing sections
    };

    const issues = getPersonalSiteReadiness(legacySite);
    expect(issues.some((i) => i.id === "no-pages")).toBe(false);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(false);
  });

  it("falls back to top-level sections when page sections are empty", () => {
    // Renderer: a page with an empty sections array falls back to site.sections.
    // Readiness must count the effective visible sections — no false warning.
    const siteFallback = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "fallback-site",
      title: "Fallback Studio",
      hero: "Hero text",
      published: true,
      ctaLabel: "Hubungi",
      ctaUrl: "https://wa.me/62812345678",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: [], // empty → renderer falls back to site.sections
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
      // DEFAULT_PERSONAL_SITE.sections carries content-bearing sections
    };

    const issues = getPersonalSiteReadiness(siteFallback);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(false);
  });

  it("allows multi-page with content on at least one page", () => {
    const siteMultiPage = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "multi-page-site",
      title: "Multi Page Studio",
      hero: "Hero text",
      published: true,
      ctaLabel: "Get in Touch",
      ctaUrl: "https://wa.me/62812345678",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Beranda",
          isHome: true,
          sections: [], // Empty home
        },
        {
          id: "about",
          slug: "about",
          title: "Tentang",
          isHome: false,
          sections: [
            {
              id: "about-text",
              type: "custom" as const,
              heading: "About Section",
              content: "Kami adalah studio digital yang fokus pada hasil nyata.",
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteMultiPage);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(false);
  });

  it("warns when no home page exists", () => {
    const siteNoHome = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "no-home",
      title: "Test",
      hero: "Test",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      pages: [
        {
          id: "contact",
          slug: "contact",
          title: "Kontak",
          isHome: false,
          sections: [
            {
              id: "c",
              type: "contact" as const,
              heading: "Contact Us",
              methods: [{ id: "m1", label: "Email", value: "test@test.com", url: "" }],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteNoHome);
    expect(issues.some((i) => i.id === "no-home-page")).toBe(true);
  });

  it("handles nullish themeConfig gracefully", () => {
    const issues = getPersonalSiteReadiness({
      ...DEFAULT_PERSONAL_SITE,
      themeConfig: null as any,
      title: "Test",
      hero: "Test hero",
      published: false,
    });
    expect(issues.some((i) => i.id === "theme-config-missing")).toBe(true);
  });

  it("handles missing pages array safely and renders top-level sections", () => {
    // Renderer supports pages-less legacy sites: it synthesizes a home page
    // from site.sections, so readiness must not treat missing pages as an error.
    const issues = getPersonalSiteReadiness({
      ...DEFAULT_PERSONAL_SITE,
      pages: undefined as any,
      title: "Test",
      hero: "Test hero",
      published: false,
    });
    expect(issues.some((i) => i.id === "no-pages")).toBe(false);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(false);
    expect(issues.some((i) => i.id === "no-home-page")).toBe(false);
  });

  it("never crashes on nullish slug and still guards reserved lowercase slugs", () => {
    // Regression: reserved check called site.slug.toLowerCase() and crashed
    // when slug was null/undefined at runtime (schema not enforced).
    for (const nullishSlug of [null, undefined]) {
      let issues: ReturnType<typeof getPersonalSiteReadiness> = [];
      expect(() => {
        issues = getPersonalSiteReadiness({
          ...DEFAULT_PERSONAL_SITE,
          slug: nullishSlug as unknown as string,
          title: "Test",
          hero: "Test hero",
          published: false,
        });
      }).not.toThrow();
      expect(issues.some((i) => i.id === "slug-empty")).toBe(true);
      expect(issues.some((i) => i.id === "slug-reserved")).toBe(false);
    }

    // Reserved lowercase slugs are still flagged (runtime-cast through schema).
    const issues = getPersonalSiteReadiness({
      ...DEFAULT_PERSONAL_SITE,
      slug: "admin" as string,
      title: "Test",
      hero: "Test hero",
      published: false,
    });
    expect(issues.some((i) => i.id === "slug-reserved")).toBe(true);
  });

  it("reports example/placeholder destinations as publish errors", () => {
    const sitePlaceholder = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "placeholder-site",
      title: "Test",
      hero: "Test hero",
      published: true,
      ctaLabel: "Contact",
      ctaUrl: "https://example.com/",
      pages: [DEFAULT_PERSONAL_SITE.pages![0]],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(sitePlaceholder);
    expect(issues.some((i) => i.id === "placeholder-example-destination")).toBe(true);
    expect(issues.some((i) => i.id === "cta-url-invalid")).toBe(false); // safe protocol, placeholder instead

    // mailto:hello@example.com is equally blocked
    const siteMailto = { ...sitePlaceholder, ctaUrl: "mailto:hello@example.com" };
    const mailtoIssues = getPersonalSiteReadiness(siteMailto);
    expect(mailtoIssues.some((i) => i.id === "placeholder-example-destination")).toBe(true);

    // A real destination passes
    const siteReal = { ...sitePlaceholder, ctaUrl: "https://wa.me/62812345678" };
    const realIssues = getPersonalSiteReadiness(siteReal);
    expect(realIssues.some((i) => i.id === "placeholder-example-destination")).toBe(false);
    expect(realIssues.some((i) => i.id === "cta-url-invalid")).toBe(false);
  });

  it("does not count fake-proof testimonials as content", () => {
    const siteFakeProof = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "fake-proof",
      title: "Test",
      hero: "Test hero",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      sections: [],
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "t1",
              type: "testimonials" as const,
              heading: "Apa kata klien",
              testimonials: [
                { id: "q1", quote: "Website yang dibangun meningkatkan konversi kita hingga 40%.", author: "Andi Wijaya", role: "Founder TechCorp" },
              ],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteFakeProof);
    expect(issues.some((i) => i.id === "no-content-sections")).toBe(true);
  });

  it("validates unpaired CTA when published is false does not error", () => {
    const siteUnpublished = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "unpublished-test",
      title: "Test",
      hero: "Test hero",
      published: false, // Unpublished
      ctaLabel: "Contact Us",
      ctaUrl: "",
      pages: [DEFAULT_PERSONAL_SITE.pages![0]],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteUnpublished);
    expect(issues.some((i) => i.id === "cta-unpaired")).toBe(false);
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);
  });

  it("detects contact links in pages' CTA sections", () => {
    const siteWithCtaSection = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "cta-section-site",
      title: "Test",
      hero: "Test",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "cta1",
              type: "cta" as const,
              heading: "Get Started",
              text: "Start your project today",
              buttonLabel: "Start",
              buttonUrl: "https://calendar.example.com/book",
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteWithCtaSection);
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);
  });

  it("detects contact links in pages' contact sections", () => {
    const siteWithContactSection = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "contact-section-site",
      title: "Test",
      hero: "Test",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "contact1",
              type: "contact" as const,
              heading: "Reach Out",
              methods: [{ id: "m1", label: "WhatsApp", value: "+62812345678", url: "" }],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteWithContactSection);
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);
  });

  it("detects social and portfolio links as valid contact methods", () => {
    const siteWithLinks = {
      ...DEFAULT_PERSONAL_SITE,
      slug: "links-site",
      title: "Test",
      hero: "Test",
      published: true,
      ctaLabel: "",
      ctaUrl: "",
      links: [
        { id: "link1", label: "Twitter", url: "https://twitter.com/testuser" },
      ],
      pages: [
        {
          id: "home",
          slug: "",
          title: "Home",
          isHome: true,
          sections: [
            {
              id: "social1",
              type: "social" as const,
              heading: "Follow Me",
              links: [{ id: "s1", platform: "GitHub", url: "https://github.com/test" }],
            },
          ],
        },
      ],
      themeConfig: DEFAULT_PERSONAL_SITE.themeConfig!,
    };

    const issues = getPersonalSiteReadiness(siteWithLinks);
    expect(issues.some((i) => i.id === "no-contact-method")).toBe(false);
  });
});

describe("isReadyToPublish", () => {
  it("returns true when only warnings exist", () => {
    const warningsOnly = [
      { id: "w1", severity: "warning" as const, label: "Warning 1" },
      { id: "w2", severity: "warning" as const, label: "Warning 2" },
    ];
    expect(isReadyToPublish(warningsOnly)).toBe(true);
  });

  it("returns false when any error exists", () => {
    const mixedIssues = [
      { id: "w1", severity: "warning" as const, label: "Warning" },
      { id: "e1", severity: "error" as const, label: "Error" },
    ];
    expect(isReadyToPublish(mixedIssues)).toBe(false);
  });
});

describe("countReadinessIssues", () => {
  it("correctly counts errors and warnings separately", () => {
    const issues = [
      { id: "e1", severity: "error" as const, label: "Error 1" },
      { id: "w1", severity: "warning" as const, label: "Warning 1" },
      { id: "e2", severity: "error" as const, label: "Error 2" },
      { id: "w2", severity: "warning" as const, label: "Warning 2" },
      { id: "w3", severity: "warning" as const, label: "Warning 3" },
    ];
    const counts = countReadinessIssues(issues);
    expect(counts.errors).toBe(2);
    expect(counts.warnings).toBe(3);
  });

  it("returns zeros for empty array", () => {
    const counts = countReadinessIssues([]);
    expect(counts.errors).toBe(0);
    expect(counts.warnings).toBe(0);
  });
});
