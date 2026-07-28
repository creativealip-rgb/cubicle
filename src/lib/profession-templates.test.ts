import { describe, expect, it } from "vitest";
import { PROFESSION_TEMPLATES, getProfessionTemplate } from "@/lib/profession-templates";

describe("profession templates", () => {
  it("provides editable service and activity seeds for all planned professions", () => {
    expect(Object.keys(PROFESSION_TEMPLATES)).toEqual([
      "virtual-assistant", "developer", "designer", "writer", "social-media-manager", "consultant",
    ]);
    for (const template of Object.values(PROFESSION_TEMPLATES)) {
      expect(template.services.length).toBeGreaterThanOrEqual(4);
      expect(template.activities.length).toBeGreaterThanOrEqual(5);
      expect(new Set(template.services).size).toBe(template.services.length);
      expect(new Set(template.activities).size).toBe(template.activities.length);
    }
  });

  it("returns a defensive copy so seeded catalog can be edited", () => {
    const first = getProfessionTemplate("developer");
    first.activities.push("Changed");
    expect(getProfessionTemplate("developer").activities).not.toContain("Changed");
  });
});
