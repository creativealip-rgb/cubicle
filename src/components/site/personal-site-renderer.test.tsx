import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DEFAULT_PERSONAL_SITE, type PersonalSiteInput } from "@/lib/personal-site/model";
import { PersonalSiteRenderer } from "./personal-site-renderer";

describe("PersonalSiteRenderer", () => {
  it("renders distinct typed sections and omits empty proof", () => {
    const site: PersonalSiteInput = {
      ...DEFAULT_PERSONAL_SITE,
      ctaUrl: "https://cal.com/owner/book",
      pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections: [
        { id: "s", type: "services", heading: "Services", items: [{ id: "s1", title: "Design", description: "Product design" }] },
        { id: "p", type: "process", heading: "Process", steps: [{ id: "p1", title: "Brief", description: "Align" }] },
        { id: "f", type: "faq", heading: "FAQ", items: [{ id: "f1", question: "How?", answer: "Together" }] },
        { id: "t", type: "testimonials", heading: "Proof", testimonials: [] },
      ] }],
      sections: [],
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
      pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections: [{
          id: "t",
          type: "testimonials" as const,
          heading: "Apa kata klien",
          testimonials: [
            { id: "real", quote: "Kolaborasi sangat lancar dan hasilnya tepat sasaran.", author: "Rina", role: "Founder Toko Rina" },
            { id: "fake", quote: "Website yang dibangun meningkatkan konversi kita hingga 40%.", author: "Andi Wijaya", role: "Founder TechCorp" },
          ],
        }], }],
      sections: [],
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

  describe("embed sources", () => {
    function renderEmbed(url: string) {
      const site: PersonalSiteInput = {
        ...DEFAULT_PERSONAL_SITE,
        ctaUrl: "https://cal.com/owner/book",
        sections: [],
        pages: [
          {
            id: "home",
            slug: "",
            title: "Home",
            isHome: true,
            sections: [{ id: "e", type: "embed", heading: "Video", url, height: 400 }],
          },
        ],
      };
      return renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    }

    it("renders an iframe for an absolute http(s) source", () => {
      const html = renderEmbed("https://www.youtube.com/embed/abc");
      expect(html).toContain("<iframe");
      expect(html).toContain('src="https://www.youtube.com/embed/abc"');
    });

    it.each([
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "#pricing",
      "/booking/acme",
    ])("renders no iframe for %s", (url) => {
      // Only absolute http(s) is a valid iframe target. `#anchor`, mailto and
      // app-relative paths are legitimate hrefs but would render a blank frame,
      // and the script schemes must never reach the sink at all.
      const html = renderEmbed(url);
      expect(html).not.toContain("<iframe");
      expect(html).not.toContain(url);
    });
  });

  describe("image accessibility", () => {
    function renderImages(sections: unknown[]) {
      const site = {
        ...DEFAULT_PERSONAL_SITE,
        heroImage: "https://cdn.example.com/hero.png",
        sections: [],
        pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections }],
      } as PersonalSiteInput;
      return renderToStaticMarkup(<PersonalSiteRenderer site={site} />);
    }

    it("keeps the hero image decorative (empty alt, aria-hidden)", () => {
      const html = renderToStaticMarkup(
        <PersonalSiteRenderer
          site={{ ...DEFAULT_PERSONAL_SITE, heroImage: "https://cdn.example.com/hero.png", sections: [], pages: [{ id: "home", slug: "", title: "Home", isHome: true, sections: [] }] } as PersonalSiteInput}
        />,
      );
      expect(html).toContain('aria-hidden="true"');
      // Only the hero image is present, and it must stay decorative.
      expect(html.match(/alt=""/g) ?? []).toHaveLength(1);
    });

    it("emits an empty alt only for images marked decorative", () => {
      const html = renderImages([
        { id: "img-dec", type: "image", heading: "Ornamen", url: "https://cdn.example.com/dec.png", decorative: true },
        { id: "img-alt", type: "image", heading: "Tim", url: "https://cdn.example.com/team.png", alt: "Foto tim" },
        { id: "img-plain", type: "image", heading: "Kantor", url: "https://cdn.example.com/office.png" },
      ]);
      expect(html).toMatch(/src="https:\/\/cdn\.example\.com\/dec\.png"[^>]*alt=""/);
      expect(html).toMatch(/src="https:\/\/cdn\.example\.com\/team\.png"[^>]*alt="Foto tim"/);
      // Unchanged fallback for content that never set `decorative`.
      expect(html).toMatch(/src="https:\/\/cdn\.example\.com\/office\.png"[^>]*alt="Kantor"/);
    });
  });
});
