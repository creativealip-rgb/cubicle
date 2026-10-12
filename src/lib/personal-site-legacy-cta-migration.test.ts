import { describe, expect, it } from "vitest";
import { normalizeStoredPersonalSite } from "./personal-site/model";

describe("legacy personal-site CTA migration", () => {
  it("moves text-only global CTA into an editable structure section", () => {
    const site = normalizeStoredPersonalSite({ title: "Portfolio", ctaLabel: "Contact us for a free consultation", ctaUrl: "", sections: [] });
    expect(site.ctaLabel).toBe("");
    expect(site.sections).toContainEqual(expect.objectContaining({ type: "cta", text: "Contact us for a free consultation" }));
  });

  it("keeps linked CTA as the hero action", () => {
    const site = normalizeStoredPersonalSite({ title: "Portfolio", ctaLabel: "Contact us", ctaUrl: "https://example.com", sections: [] });
    expect(site.ctaLabel).toBe("Contact us");
    expect(site.sections.some((section) => section.type === "cta")).toBe(false);
  });
});