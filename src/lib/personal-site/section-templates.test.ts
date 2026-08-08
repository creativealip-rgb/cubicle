import { describe, it, expect } from "vitest";
import { SECTION_TEMPLATES } from "./section-templates";
import { personalSiteSectionSchema } from "./model";
import type { PersonalSiteSection } from "./model";
import { collectSectionIds } from "./page-templates.test";

function itemIds(section: PersonalSiteSection): string[] {
  switch (section.type) {
    case "services":
      return section.items.map((i) => i.id);
    case "process":
      return section.steps.map((i) => i.id);
    case "pricing":
      return section.offers.map((i) => i.id);
    case "portfolio":
      return section.projects.map((i) => i.id);
    case "testimonials":
      return section.testimonials.map((i) => i.id);
    case "faq":
      return section.items.map((i) => i.id);
    case "contact":
      return section.methods.map((i) => i.id);
    case "gallery":
      return section.images.map((i) => i.id);
    case "social":
      return section.links.map((i) => i.id);
    case "collapsible":
      return section.items.map((i) => i.id);
    case "contentBlock":
      return section.items.map((i) => i.id);
    default:
      return [];
  }
}

describe("SECTION_TEMPLATES schema validity", () => {
  it("every SECTION_TEMPLATES build passes personalSiteSectionSchema", () => {
    for (const template of SECTION_TEMPLATES) {
      const section = template.build();
      const parsed = personalSiteSectionSchema.safeParse(section);
      expect(
        parsed.success,
        `SECTION_TEMPLATE ${template.id} failed schema: ${JSON.stringify(!parsed.success ? parsed.error.issues : [])}`
      ).toBe(true);
    }
  });

  it("every built section and item ID is non-empty and unique within the section", () => {
    for (const template of SECTION_TEMPLATES) {
      const section = template.build();
      const ids = collectSectionIds(section);
      expect(ids.length).toBeGreaterThan(0);
      for (const id of ids) {
        expect(id.trim(), `empty id in ${template.id}`).not.toBe("");
      }
      expect(new Set(ids).size, `duplicate id in ${template.id}`).toBe(ids.length);
    }
  });

  it("separate builds get fresh section and item IDs", () => {
    for (const template of SECTION_TEMPLATES) {
      const first = template.build();
      const second = template.build();
      expect(first.id).not.toBe(second.id);
      expect(first.id.trim()).not.toBe("");

      const firstItems = itemIds(first);
      const secondItems = itemIds(second);
      expect(firstItems.length).toBe(secondItems.length);
      for (const id of firstItems) {
        expect(secondItems).not.toContain(id);
      }
    }
  });

  it("cta-primary uses a schema-valid buttonUrl (no bare '#')", () => {
    const cta = SECTION_TEMPLATES.find((t) => t.id === "cta-primary");
    expect(cta).toBeDefined();
    const section = cta!.build();
    expect(section.type).toBe("cta");
    if (section.type === "cta") {
      expect(section.buttonUrl).not.toBe("#");
      const parsed = personalSiteSectionSchema.safeParse(section);
      expect(parsed.success).toBe(true);
    }
  });

  it("divider-simple and spacer-large have non-empty headings", () => {
    for (const id of ["divider-simple", "spacer-large"]) {
      const template = SECTION_TEMPLATES.find((t) => t.id === id);
      expect(template, `missing template ${id}`).toBeDefined();
      const section = template!.build();
      expect(section.heading.trim().length, `${id} heading must be non-empty`).toBeGreaterThan(0);
      const parsed = personalSiteSectionSchema.safeParse(section);
      expect(parsed.success).toBe(true);
    }
  });
});
