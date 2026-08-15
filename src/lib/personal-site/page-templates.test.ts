import { describe, it, expect } from "vitest";
import { PAGE_TEMPLATES } from "./page-templates";
import type { PersonalSiteInput, PersonalSiteSection } from "@/lib/personal-site/model";
import { DEFAULT_PERSONAL_SITE, personalSiteInputSchema } from "./model";

describe("PAGE_TEMPLATES", () => {
  it("should have at least 3 page templates defined", () => {
    expect(PAGE_TEMPLATES).toHaveLength(3);
  });

  it("should include Freelancer Profile template", () => {
    const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile");
    expect(freelancer).toBeDefined();
    expect(freelancer?.label).toBe("Freelancer Profile");
    expect(freelancer?.description).toContain("freelancer");
  });

  it("should include Agency Website template", () => {
    const agency = PAGE_TEMPLATES.find((t) => t.id === "agency-website");
    expect(agency).toBeDefined();
    expect(agency?.label).toBe("Agency Website");
    expect(agency?.description).toContain("agensi");
  });

  it("should include Service Offer template", () => {
    const service = PAGE_TEMPLATES.find((t) => t.id === "service-offer");
    expect(service).toBeDefined();
    expect(service?.label).toBe("Service Offer");
    expect(service?.description).toContain("Landing page");
  });

  describe("template building", () => {
    it("should build a valid Freelancer Profile with sections", () => {
      const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile")!;
      const site = DEFAULT_PERSONAL_SITE as PersonalSiteInput;
      
      const result = freelancer.build(site);
      
      expect(result.title).toContain("Nama Anda");
      expect(result.subtitle).toContain("Freelancer");
      expect(result.hero ?? "").toContain("Saya");
      expect(result.ctaLabel).toBe("Konsultasi Gratis");
      expect(result.pages).toHaveLength(1);
      expect(result.pages?.[0].sections).toBeDefined();
      expect(result.pages?.[0].sections).toBeInstanceOf(Array);
    });

    it("should build an Agency Website with multiple pages", () => {
      const agency = PAGE_TEMPLATES.find((t) => t.id === "agency-website")!;
      const site = DEFAULT_PERSONAL_SITE as PersonalSiteInput;
      
      const result = agency.build(site);
      
      expect(result.title).toContain("Nama Agensi");
      expect(result.subtitle).toContain("Digital Agency");
      expect(result.pages).toHaveLength(2);
      expect(result.pages?.find((p) => p.isHome)).toBeDefined();
      expect(result.pages?.find((p) => p.slug === "about")).toBeDefined();
    });

    it("should build a Service Offer with pricing page", () => {
      const service = PAGE_TEMPLATES.find((t) => t.id === "service-offer")!;
      const site = DEFAULT_PERSONAL_SITE as PersonalSiteInput;
      
      const result = service.build(site);
      
      expect(result.title).toContain("Nama Jasa");
      expect(result.pages).toHaveLength(2);
      const pricingPage = result.pages?.find((p) => p.slug === "pricing");
      expect(pricingPage).toBeDefined();
      expect(pricingPage?.sections.length).toBeGreaterThan(0);
    });

    it("should set default title on templates", () => {
      const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile")!;
      const result = freelancer.build(DEFAULT_PERSONAL_SITE as PersonalSiteInput);
      
      expect(result.title).toBe("Nama Anda – Freelancer");
    });

    it("should preserve original site title if provided", () => {
      const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile")!;
      const customSite = {
        ...DEFAULT_PERSONAL_SITE,
        title: "Custom Business Name",
      } as PersonalSiteInput;
      
      // Template uses fixed title, not dynamic from site
      const result = freelancer.build(customSite);
      
      expect(result.title).toBe("Nama Anda – Freelancer");
    });

    it("should set isHome correctly on home page", () => {
      const templates = ["freelancer-profile", "agency-website", "service-offer"];
      
      for (const id of templates) {
        const template = PAGE_TEMPLATES.find((t) => t.id === id)!;
        const result = template.build(DEFAULT_PERSONAL_SITE as PersonalSiteInput);
        
        const homePage = result.pages?.find((p) => p.isHome);
        expect(homePage).toBeDefined();
        expect(homePage?.slug).toBe("");
        expect(homePage?.title).toBeDefined();
      }
    });
  });

  describe("section content in templates", () => {
    it("Freelancer Profile should have services and CTA", () => {
      const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile")!;
      const result = freelancer.build(DEFAULT_PERSONAL_SITE as PersonalSiteInput);
      
      const sections = result.pages?.[0].sections;
      expect(sections).toBeDefined();
      expect(sections?.length).toBeGreaterThan(0);
      
      const types = sections?.map((s) => s.type);
      expect(types).toContain("services");
      expect(types).toContain("cta");
    });

    it("Agency Website should have services and gallery", () => {
      const agency = PAGE_TEMPLATES.find((t) => t.id === "agency-website")!;
      const result = agency.build(DEFAULT_PERSONAL_SITE as PersonalSiteInput);
      
      const sections = result.pages?.[0].sections;
      expect(sections).toBeDefined();
      
      const types = sections?.map((s) => s.type);
      expect(types).toContain("services");
      expect(types).toContain("gallery");
      expect(types).toContain("pricing");
    });

    it("Service Offer should have FAQ and CTA", () => {
      const service = PAGE_TEMPLATES.find((t) => t.id === "service-offer")!;
      const result = service.build(DEFAULT_PERSONAL_SITE as PersonalSiteInput);
      
      const sections = result.pages?.[0].sections;
      expect(sections).toBeDefined();
      
      const types = sections?.map((s) => s.type);
      expect(types).toContain("faq");
      expect(types).toContain("cta");
    });
  });

  describe("template categories", () => {
    it("should categorize Freelancer under individual", () => {
      const freelancer = PAGE_TEMPLATES.find((t) => t.id === "freelancer-profile");
      expect(freelancer?.category).toBe("individual");
    });

    it("should categorize Agency and Service under business", () => {
      const agency = PAGE_TEMPLATES.find((t) => t.id === "agency-website");
      const service = PAGE_TEMPLATES.find((t) => t.id === "service-offer");
      
      expect(agency?.category).toBe("business");
      expect(service?.category).toBe("business");
    });

    it("should filter templates by category", () => {
      const templates = PAGE_TEMPLATES.filter((t) => t.category === "business");
      expect(templates).toHaveLength(2);
      expect(templates.map((t) => t.id)).toContain("agency-website");
      expect(templates.map((t) => t.id)).toContain("service-offer");
    });
  });

  // Mirrors canvas-editor applyTemplate(): patch merged over the current site,
  // home page sections synced to top-level sections.
  function applyTemplateMerge(site: PersonalSiteInput, templateId: string): PersonalSiteInput {
    const template = PAGE_TEMPLATES.find((t) => t.id === templateId);
    if (!template) throw new Error(`Template not found: ${templateId}`);
    const patch = template.build(site);
    const nextPages = patch.pages ?? [];
    const homePage = nextPages.find((p) => p.isHome) ?? nextPages[0];
    const nextPatch: Partial<PersonalSiteInput> = {
      ...patch,
      pages: homePage ? nextPages.map((page) => ({ ...page, isHome: page.id === homePage.id })) : nextPages,
      sections: homePage?.sections ?? [],
    };
    return { ...site, ...nextPatch };
  }

  describe("schema validity (review evidence)", () => {
    it("every PAGE_TEMPLATES patch merged over DEFAULT_PERSONAL_SITE passes personalSiteInputSchema", () => {
      // Non-default site values to prove slug/published/theme/accent/links are preserved by the merge.
      const site: PersonalSiteInput = {
        ...DEFAULT_PERSONAL_SITE,
        slug: "review-site",
        published: true,
        theme: "paper",
        accent: "#00ff88",
      };

      for (const template of PAGE_TEMPLATES) {
        const merged = applyTemplateMerge(site, template.id);
        const parsed = personalSiteInputSchema.safeParse(merged);
        expect(parsed.success, `PAGE_TEMPLATE ${template.id} failed schema: ${JSON.stringify(!parsed.success ? parsed.error.issues : [])}`).toBe(true);

        // Preserved fields must survive the merge untouched.
        expect(merged.slug).toBe("review-site");
        expect(merged.published).toBe(true);
        expect(merged.theme).toBe("paper");
        expect(merged.accent).toBe("#00ff88");
        expect(merged.links).toEqual(site.links);

        // Exactly one home page, and top-level sections mirror it.
        const homes = merged.pages?.filter((p) => p.isHome) ?? [];
        expect(homes).toHaveLength(1);
        expect(merged.sections).toEqual(homes[0].sections);
      }
    });

    it("merged site IDs are non-empty and unique within a site", () => {
      for (const template of PAGE_TEMPLATES) {
        const merged = applyTemplateMerge(DEFAULT_PERSONAL_SITE, template.id);
        const seen = new Set<string>();
        const pageIds = (merged.pages ?? []).map((p) => p.id);
        expect(new Set(pageIds).size).toBe(pageIds.length);

        for (const page of merged.pages ?? []) {
          expect(page.id.trim()).not.toBe("");
          for (const section of page.sections) {
            expect(section.id.trim()).not.toBe("");
            expect(seen.has(section.id)).toBe(false);
            seen.add(section.id);
          }
        }
      }
    });

    it("separate page-template builds get fresh section IDs", () => {
      for (const template of PAGE_TEMPLATES) {
        const first = template.build(DEFAULT_PERSONAL_SITE);
        const second = template.build(DEFAULT_PERSONAL_SITE);
        const idsOf = (pages: PersonalSiteInput["pages"]) =>
          (pages ?? []).flatMap((p) => p.sections.map((s) => s.id));
        const firstIds = idsOf(first.pages);
        const secondIds = idsOf(second.pages);
        expect(firstIds.length).toBeGreaterThan(0);
        for (const id of firstIds) {
          expect(secondIds).not.toContain(id);
        }
      }
    });
  });
});

// Section-level helpers kept importable for the section-templates spec.
export function collectSectionIds(section: PersonalSiteSection): string[] {
  switch (section.type) {
    case "services":
      return [section.id, ...section.items.map((i) => i.id)];
    case "process":
      return [section.id, ...section.steps.map((i) => i.id)];
    case "pricing":
      return [section.id, ...section.offers.map((i) => i.id)];
    case "portfolio":
      return [section.id, ...section.projects.map((i) => i.id)];
    case "testimonials":
      return [section.id, ...section.testimonials.map((i) => i.id)];
    case "faq":
      return [section.id, ...section.items.map((i) => i.id)];
    case "contact":
      return [section.id, ...section.methods.map((i) => i.id)];
    case "gallery":
      return [section.id, ...section.images.map((i) => i.id)];
    case "social":
      return [section.id, ...section.links.map((i) => i.id)];
    case "collapsible":
      return [section.id, ...section.items.map((i) => i.id)];
    case "contentBlock":
      return [section.id, ...section.items.map((i) => i.id)];
    default:
      return [section.id];
  }
}
