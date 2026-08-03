import { describe, it, expect } from "vitest";
import { personalSiteSectionSchema, type PersonalSiteSection } from "@/lib/personal-site/model";
import { PropertiesPanel, makeItemId, appendItem, patchItem, removeItemAt } from "./properties-panel";
import { renderToStaticMarkup } from "react-dom/server";

describe("properties panel pure helpers", () => {
  describe("makeItemId", () => {
    it("uses the requested prefix and stays under the model id limit", () => {
      for (const prefix of ["service", "offer", "faq", "image"]) {
        const id = makeItemId(prefix);
        expect(id.startsWith(`${prefix}_`)).toBe(true);
        expect(id.length).toBeGreaterThan(prefix.length + 1);
        expect(id.length).toBeLessThanOrEqual(80);
      }
    });

    it("produces stable fresh ids — no collisions across many calls", () => {
      const ids = Array.from({ length: 500 }, () => makeItemId("item"));
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe("appendItem", () => {
    it("appends without mutating the source array", () => {
      const source: { id: string; v: number }[] = [{ id: "a", v: 1 }];
      const result = appendItem(source, () => ({ id: "b", v: 2 }));
      expect(result).toEqual([{ id: "a", v: 1 }, { id: "b", v: 2 }]);
      expect(source).toHaveLength(1);
    });
  });

  describe("patchItem", () => {
    it("patches only the target index, leaving siblings untouched", () => {
      const items = [
        { id: "one", title: "A", description: "x" },
        { id: "two", title: "B", description: "y" },
        { id: "three", title: "C", description: "z" },
      ];
      const result = patchItem(items, 1, { title: "B2" });
      expect(result).toEqual([
        { id: "one", title: "A", description: "x" },
        { id: "two", title: "B2", description: "y" },
        { id: "three", title: "C", description: "z" },
      ]);
      expect(items[1].title).toBe("B"); // source untouched
    });

    it("is a no-op copy for out-of-range indexes", () => {
      const items = [{ id: "a" }];
      expect(patchItem(items, 5, { id: "changed" })).toEqual([{ id: "a" }]);
      expect(patchItem(items, -1, { id: "changed" })).toEqual([{ id: "a" }]);
    });
  });

  describe("removeItemAt", () => {
    it("removes the target index", () => {
      const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
      expect(removeItemAt(items, 1)).toEqual([{ id: "a" }, { id: "c" }]);
      expect(items).toHaveLength(3); // source untouched
    });

    it("returns a copy for out-of-range indexes", () => {
      const items = [{ id: "a" }];
      expect(removeItemAt(items, 5)).toEqual([{ id: "a" }]);
      expect(removeItemAt(items, -1)).toEqual([{ id: "a" }]);
    });
  });
});

describe("properties panel structured edits stay schema-compatible", () => {
  // Mirrors exactly what the panel's add/edit/remove handlers produce,
  // then validates the resulting section against the save schema.

  it("services: add, edit, remove", () => {
    let section: Extract<PersonalSiteSection, { type: "services" }> = {
      id: "svc-1", type: "services", heading: "Layanan",
      items: [{ id: "i1", title: "Jasa A", description: "Deskripsi A" }],
    };

    section = { ...section, items: appendItem(section.items, () => ({ id: makeItemId("service"), title: "", description: "" })) };
    expect(section.items).toHaveLength(2);

    section = { ...section, items: patchItem(section.items, 1, { title: "Jasa B", description: "Baru" }) };
    section = { ...section, items: removeItemAt(section.items, 0) };
    expect(section.items).toEqual([{ id: section.items[0].id, title: "Jasa B", description: "Baru" }]);

    const parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : [])).toBe(true);
  });

  it("pricing: add, edit name/price/description, remove", () => {
    let section: Extract<PersonalSiteSection, { type: "pricing" }> = {
      id: "prc-1", type: "pricing", heading: "Harga",
      offers: [{ id: "o1", name: "Basic", price: "Rp1jt", description: "" }],
    };

    section = { ...section, offers: appendItem(section.offers, () => ({ id: makeItemId("offer"), name: "", price: "", description: "" })) };
    section = { ...section, offers: patchItem(section.offers, 1, { name: "Pro", price: "Rp5jt", description: "Fitur lengkap" }) };
    expect(section.offers).toHaveLength(2);

    section = { ...section, offers: removeItemAt(section.offers, 0) };
    expect(section.offers[0].name).toBe("Pro");

    const parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : [])).toBe(true);
  });

  it("faq: add, edit question/answer, remove", () => {
    let section: Extract<PersonalSiteSection, { type: "faq" }> = {
      id: "faq-1", type: "faq", heading: "FAQ",
      items: [{ id: "q1", question: "Berapa lama?", answer: "2 minggu" }],
    };

    section = { ...section, items: appendItem(section.items, () => ({ id: makeItemId("faq"), question: "", answer: "" })) };
    section = { ...section, items: patchItem(section.items, 1, { question: "Bisa revisi?", answer: "Bisa" }) };
    section = { ...section, items: removeItemAt(section.items, 0) };
    expect(section.items.map((i) => i.question)).toEqual(["Bisa revisi?"]);

    const parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : [])).toBe(true);
  });

  it("gallery: add, edit url/alt, remove", () => {
    let section: Extract<PersonalSiteSection, { type: "gallery" }> = {
      id: "gal-1", type: "gallery", heading: "Galeri",
      images: [{ id: "im1", url: "https://example.com/a.png", alt: "A" }],
    };

    section = { ...section, images: appendItem(section.images, () => ({ id: makeItemId("image"), url: "", alt: "" })) };
    section = { ...section, images: patchItem(section.images, 1, { url: "https://example.com/b.png", alt: "B" }) };
    expect(section.images).toHaveLength(2);

    section = { ...section, images: removeItemAt(section.images, 0) };
    const parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : [])).toBe(true);
  });

  it("cta: text/button label/url edits", () => {
    let section: Extract<PersonalSiteSection, { type: "cta" }> = {
      id: "cta-1", type: "cta", heading: "Ayo", text: "", buttonLabel: "", buttonUrl: "",
    };

    section = { ...section, text: "Siap mulai?", buttonLabel: "Hubungi", buttonUrl: "mailto:hi@example.com" };
    let parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success, JSON.stringify(!parsed.success ? parsed.error.issues : [])).toBe(true);

    // Empty buttonUrl stays valid (button disabled state).
    section = { ...section, buttonUrl: "" };
    parsed = personalSiteSectionSchema.safeParse(section);
    expect(parsed.success).toBe(true);
  });

  it("animation edits stay within PERSONAL_SITE_ANIMATIONS", () => {
    const section: Extract<PersonalSiteSection, { type: "services" }> = {
      id: "svc-1", type: "services", heading: "Layanan", animation: "fade-up",
      items: [{ id: "i1", title: "A", description: "" }],
    };
    const parsed = personalSiteSectionSchema.safeParse({ ...section, animation: "zoom-in" });
    expect(parsed.success).toBe(true);
  });
});

describe("PropertiesPanel rendering", () => {
  const servicesSection: Extract<PersonalSiteSection, { type: "services" }> = {
    id: "svc-1", type: "services", heading: "Layanan Saya", animation: "fade-up",
    items: [{ id: "i1", title: "Jasa A", description: "Deskripsi A" }],
  };

  it("renders nothing when no section is selected", () => {
    const html = renderToStaticMarkup(<PropertiesPanel section={null} onUpdate={() => {}} onClose={() => {}} />);
    expect(html).toBe("");
  });

  it("renders shared heading + animation controls bound to the section", () => {
    const html = renderToStaticMarkup(<PropertiesPanel section={servicesSection} onUpdate={() => {}} onClose={() => {}} />);
    expect(html).toContain("Layanan Saya");
    // Heading input carries current value.
    expect(html).toContain('value="Layanan Saya"');
    // Animation select carries current value as selected option.
    expect(html).toContain('value="fade-up" selected');
    // Check zoom-in appears as an option (lowercase, per PERSONAL_SITE_ANIMATIONS)
    expect(html.toLowerCase()).toContain("zoom-in");
  });

  it("renders structured editors for supported section types", () => {
    const servicesHtml = renderToStaticMarkup(<PropertiesPanel section={servicesSection} onUpdate={() => {}} onClose={() => {}} />);
    expect(servicesHtml).toContain("Jasa A");
    expect(servicesHtml).toContain("Add service");

    const ctaSection: Extract<PersonalSiteSection, { type: "cta" }> = {
      id: "cta-1", type: "cta", heading: "CTA", text: "Siap?", buttonLabel: "Hubungi", buttonUrl: "https://example.com",
    };
    const ctaHtml = renderToStaticMarkup(<PropertiesPanel section={ctaSection} onUpdate={() => {}} onClose={() => {}} />);
    expect(ctaHtml).toContain("Siap?");
    expect(ctaHtml).toContain("Hubungi");
    expect(ctaHtml).toContain("https://example.com");
  });
});
