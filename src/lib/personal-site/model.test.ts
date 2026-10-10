import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERSONAL_SITE,
  emptySection,
  isEditorialPlaceholderText,
  isPlaceholderHref,
  isSafePublicHref,
  normalizeLegacyLinks,
  normalizeLegacySections,
  normalizePersonalSiteSlug,
  PERSONAL_SITE_SECTION_TYPES,
  personalSiteInputSchema,
  sectionHasContent,
  type PersonalSiteSection,
} from "./model";

describe("personal site model", () => {
  it("normalizes slugs and rejects reserved or malformed values", () => {
    expect(normalizePersonalSiteSlug("  Alip Studio!!! ")).toBe("alip-studio");
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, slug: "preview" }).success).toBe(false);
    expect(personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, slug: "Bad Slug" }).success).toBe(false);
  });

  it("allows public destinations and rejects script/app routes", () => {
    expect(isSafePublicHref("https://example.com/book")).toBe(true);
    expect(isSafePublicHref("mailto:hello@example.com")).toBe(true);
    expect(isSafePublicHref("tel:+628123456789")).toBe(true);
    expect(isSafePublicHref("/booking/alip")).toBe(true);
    expect(isSafePublicHref("/app/calendar")).toBe(false);
    expect(isSafePublicHref("javascript:alert(1)")).toBe(false);
    expect(isSafePublicHref("data:text/html,bad")).toBe(false);
  });

  it("migrates legacy section and link strings without losing content", () => {
    const sections = normalizeLegacySections("Services|Design and development.\nProcess|Discovery, build, launch.");
    expect(sections).toHaveLength(2);
    expect(sections[0]).toMatchObject({ type: "custom", heading: "Services", content: "Design and development." });

    const links = normalizeLegacyLinks("Portfolio=https://example.com\nEmail=mailto:hello@example.com");
    expect(links).toEqual([
      { id: "legacy-link-1", label: "Portfolio", url: "https://example.com" },
      { id: "legacy-link-2", label: "Email", url: "mailto:hello@example.com" },
    ]);
  });

  it("converts legacy typed cards into renderer-specific data", () => {
    const [section] = normalizeLegacySections([
      { id: "1", type: "services", heading: "Services", content: "Web Design\nAutomation" },
    ]);
    expect(section).toMatchObject({ type: "services", items: [{ title: "Web Design" }, { title: "Automation" }] });
  });

  it("does not render empty proof sections", () => {
    expect(sectionHasContent({ id: "proof", type: "testimonials", heading: "Proof", testimonials: [] })).toBe(false);
    expect(sectionHasContent({
      id: "proof",
      type: "testimonials",
      heading: "Proof",
      testimonials: [{ id: "1", quote: "Real quote", author: "Client", role: "Founder" }],
    })).toBe(true);
  });

  it("treats template fake-proof testimonials as empty content", () => {
    expect(sectionHasContent({
      id: "proof",
      type: "testimonials",
      heading: "Apa kata klien",
      testimonials: [
        { id: "1", quote: "Website yang dibangun meningkatkan konversi kita hingga 40%.", author: "Andi Wijaya", role: "Founder TechCorp" },
        { id: "2", quote: "Hasil kerja sangat memuaskan.", author: "Budi Santoso", role: "CEO StartupX" },
      ],
    })).toBe(false);
  });

  it("detects example/placeholder destinations", () => {
    expect(isPlaceholderHref("https://example.com/")).toBe(true);
    expect(isPlaceholderHref("https://example.com/contact")).toBe(true);
    expect(isPlaceholderHref("mailto:hello@example.com")).toBe(true);
    expect(isPlaceholderHref("mailto:info@example.org")).toBe(true);
    expect(isPlaceholderHref("https://wa.me/62812345678")).toBe(false);
    expect(isPlaceholderHref("mailto:owner@real-domain.com")).toBe(false);
    expect(isPlaceholderHref("")).toBe(false);
    expect(isPlaceholderHref(undefined)).toBe(false);
  });

  it("detects editorial instruction copy", () => {
    expect(isEditorialPlaceholderText("Jelaskan hasil utama yang kamu bantu capai untuk klien.")).toBe(true);
    expect(isEditorialPlaceholderText("Ceritakan keahlian dan cara kerja.")).toBe(true);
    expect(isEditorialPlaceholderText("Tell clients what you do")).toBe(true);
    expect(isEditorialPlaceholderText("Hasil dan ruang lingkup singkat.")).toBe(false);
    expect(isEditorialPlaceholderText("Membantu bisnis tampil profesional.")).toBe(false);
  });

  it("default site copy is free of editorial placeholders", () => {
    expect(isEditorialPlaceholderText(DEFAULT_PERSONAL_SITE.title)).toBe(false);
    expect(isEditorialPlaceholderText(DEFAULT_PERSONAL_SITE.hero)).toBe(false);
    expect(isEditorialPlaceholderText(DEFAULT_PERSONAL_SITE.about)).toBe(false);
    expect(DEFAULT_PERSONAL_SITE.sections[0].type).toBe("services");
  });
});

// Exhaustive over the section-type union: `Record` requires every key, so a
// 21st type added to `personalSiteSectionSchema` without listing it here fails
// to compile with TS2741, and the coverage assertion below fails at runtime.
const ALL_SECTION_TYPES: Record<PersonalSiteSection["type"], true> = {
  services: true,
  process: true,
  pricing: true,
  portfolio: true,
  testimonials: true,
  faq: true,
  contact: true,
  booking: true,
  custom: true,
  gallery: true,
  image: true,
  mediaText: true,
  embed: true,
  social: true,
  cta: true,
  divider: true,
  collapsible: true,
  spacer: true,
  tableOfContents: true,
  contentBlock: true,
};

describe("pristine block savability", () => {
  it("covers every section type exactly once", () => {
    expect(Object.keys(ALL_SECTION_TYPES).sort()).toEqual([...PERSONAL_SITE_SECTION_TYPES].sort());
  });

  it("lets a freshly added block of every type save through the storage schema", () => {
    for (const type of PERSONAL_SITE_SECTION_TYPES) {
      const section = emptySection(type);
      const parsed = personalSiteInputSchema.safeParse({ ...DEFAULT_PERSONAL_SITE, sections: [section] });
      expect(
        parsed.success,
        `${type} fresh block failed storage schema: ${parsed.success ? "" : JSON.stringify(parsed.error.issues)}`,
      ).toBe(true);
    }
  });
});
