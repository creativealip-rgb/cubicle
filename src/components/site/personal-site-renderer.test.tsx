import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_PERSONAL_SITE, type PersonalSiteInput } from "@/lib/personal-site/model";
import { PersonalSiteRenderer } from "./personal-site-renderer";

describe("PersonalSiteRenderer", () => {
  it("renders distinct typed sections and omits empty proof", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      ctaUrl: "https://cal.com/owner/book",
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
    expect(html).not.toContain("https://cal.com/owner/book");
  });

  it("never emits an unsafe CTA", () => {
    const site = { ...DEFAULT_PERSONAL_SITE, ctaLabel: "Bad", ctaUrl: "/app/calendar" } as PersonalSiteInput;
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    expect(html).not.toContain("/app/calendar");
    expect(html).not.toContain(">Bad<");
  });

  it("hides fake-proof testimonials from the public page", () => {
    const site = {
      ...DEFAULT_PERSONAL_SITE,
      sections: [
        {
          id: "t",
          type: "testimonials" as const,
          heading: "Apa kata klien",
          testimonials: [
            { id: "real", quote: "Kolaborasi sangat lancar dan hasilnya tepat sasaran.", author: "Rina", role: "Founder Toko Rina" },
            { id: "fake", quote: "Website yang dibangun meningkatkan konversi kita hingga 40%.", author: "Andi Wijaya", role: "Founder TechCorp" },
          ],
        },
      ],
    } as PersonalSiteInput;
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    expect(html).toContain("Rina");
    expect(html).not.toContain("Andi Wijaya");
    expect(html).not.toContain("TechCorp");
  });

  it("does not emit example.com destinations as CTA links", () => {
    const site = { ...DEFAULT_PERSONAL_SITE, ctaLabel: "Book", ctaUrl: "https://example.com/book" } as PersonalSiteInput;
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    expect(html).not.toContain("https://example.com/book");
  });

  it("localizes renderer chrome via labels", () => {
    const site = {
      ...DEFAULT_PERSONAL_SITE,
      pages: [
        { id: "home", slug: "", title: "Beranda", isHome: true, sections: [] },
        { id: "about", slug: "about", title: "Tentang", isHome: false, sections: [] },
      ],
    } as PersonalSiteInput;
    const html = renderToStaticMarkup(
      <PersonalSiteRenderer
        site={site}
        labels={{
          about: "Tentang",
          workWithMe: "Mari bekerja sama",
          contactHint: "Pilih cara menghubungi.",
          contact: "Hubungi Saya",
          openProject: "Buka project",
          pageNav: "Halaman situs",
        }}
      />,
    );
    expect(html).toContain("Hubungi Saya");
    expect(html).not.toContain("Contact me");
    expect(html).toContain("aria-label=\"Halaman situs\"");
    expect(html).not.toContain("aria-label=\"Site pages\"");
  });

  it.each(["midnight", "paper", "studio"] as const)("renders the %s theme", (theme) => {
    const html = renderToStaticMarkup(<PersonalSiteRenderer site={{ ...DEFAULT_PERSONAL_SITE, theme }} />);
    expect(html).toContain(`data-theme="${theme}"`);
  });
});
