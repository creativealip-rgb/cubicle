import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_PERSONAL_SITE, type PersonalSiteInput } from "@/lib/personal-site/model";
import { PersonalSiteRenderer } from "./personal-site-renderer";

describe("PersonalSiteRenderer", () => {
  it("renders distinct typed sections and omits empty proof", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      ctaUrl: "https://example.com/book",
      sections: [
        { id: "s", type: "services", heading: "Services", items: [{ id: "s1", title: "Design", description: "Product design" }] },
        { id: "p", type: "process", heading: "Process", steps: [{ id: "p1", title: "Brief", description: "Align" }] },
        { id: "f", type: "faq", heading: "FAQ", items: [{ id: "f1", question: "How?", answer: "Together" }] },
        { id: "t", type: "testimonials", heading: "Proof", testimonials: [] },
      ],
    };
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    expect(html).toContain('data-section-type="services"');
    expect(html).toContain('data-section-type="process"');
    expect(html).toContain('data-section-type="faq"');
    expect(html).not.toContain('data-section-type="testimonials"');
    expect(html).toContain("https://example.com/book");
  });

  it("never emits an unsafe CTA", () => {
    const site = { ...DEFAULT_PERSONAL_SITE, ctaLabel: "Bad", ctaUrl: "/app/calendar" } as PersonalSiteInput;
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    expect(html).not.toContain("/app/calendar");
    expect(html).not.toContain(">Bad<");
  });

  it.each(["midnight", "paper", "studio"] as const)("renders the %s theme", (theme) => {
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={{ ...DEFAULT_PERSONAL_SITE, theme }} />);
    expect(html).toContain(`data-theme="${theme}"`);
  });
});
