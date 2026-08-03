import { z } from "zod";

export const PERSONAL_SITE_THEMES = ["midnight", "paper", "studio", "ocean", "forest", "sunset", "rose", "dark"] as const;
export const PERSONAL_SITE_HEADER_STYLES = ["full-width", "contained", "minimal"] as const;
export const PERSONAL_SITE_BUTTON_STYLES = ["rounded", "pill", "square"] as const;
export const PERSONAL_SITE_SECTION_TYPES = [
  "services",
  "process",
  "pricing",
  "portfolio",
  "testimonials",
  "faq",
  "contact",
  "custom",
  "gallery",
  "embed",
  "social",
  "cta",
  "divider",
  "collapsible",
  "spacer",
  "tableOfContents",
  "contentBlock",
] as const;

export const RESERVED_PERSONAL_SITE_SLUGS = new Set([
  "preview",
  "new",
  "edit",
  "admin",
  "api",
]);

const idSchema = z.string().trim().min(1).max(80);
const headingSchema = z.string().trim().min(1).max(80);
const shortTextSchema = z.string().trim().max(160);
const descriptionSchema = z.string().trim().max(1_000);
export const PERSONAL_SITE_ANIMATIONS = ["none", "fade-up", "fade-in", "slide-left", "slide-right", "zoom-in", "bounce"] as const;
const animationSchema = z.enum(PERSONAL_SITE_ANIMATIONS).optional();
const optionalPublicHrefSchema = z
  .string()
  .trim()
  .max(2_000)
  .refine((value) => !value || isSafePublicHref(value), "Gunakan URL publik yang aman");

const serviceItemSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(100),
  description: descriptionSchema,
});

const processStepSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(100),
  description: descriptionSchema,
});

const pricingOfferSchema = z.object({
  id: idSchema,
  name: z.string().trim().min(1).max(100),
  price: z.string().trim().max(80),
  description: descriptionSchema,
});

const portfolioProjectSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(120),
  description: descriptionSchema,
  url: optionalPublicHrefSchema,
});

const testimonialSchema = z.object({
  id: idSchema,
  quote: z.string().trim().min(1).max(1_000),
  author: z.string().trim().max(100),
  role: z.string().trim().max(120),
});

const faqItemSchema = z.object({
  id: idSchema,
  question: z.string().trim().min(1).max(200),
  answer: z.string().trim().min(1).max(2_000),
});

const contactMethodSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(80),
  value: z.string().trim().max(160),
  url: optionalPublicHrefSchema,
});

export const personalSiteSectionSchema = z.discriminatedUnion("type", [
  z.object({
    id: idSchema,
    type: z.literal("services"),
    heading: headingSchema,
    animation: animationSchema,
    items: z.array(serviceItemSchema).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("process"),
    heading: headingSchema,
    animation: animationSchema,
    steps: z.array(processStepSchema).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("pricing"),
    heading: headingSchema,
    animation: animationSchema,
    offers: z.array(pricingOfferSchema).max(8),
  }),
  z.object({
    id: idSchema,
    type: z.literal("portfolio"),
    heading: headingSchema,
    animation: animationSchema,
    projects: z.array(portfolioProjectSchema).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("testimonials"),
    heading: headingSchema,
    animation: animationSchema,
    testimonials: z.array(testimonialSchema).max(8),
  }),
  z.object({
    id: idSchema,
    type: z.literal("faq"),
    heading: headingSchema,
    animation: animationSchema,
    items: z.array(faqItemSchema).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("contact"),
    heading: headingSchema,
    animation: animationSchema,
    methods: z.array(contactMethodSchema).max(8),
  }),
  z.object({
    id: idSchema,
    type: z.literal("custom"),
    heading: headingSchema,
    animation: animationSchema,
    content: z.string().trim().max(4_000),
  }),
  z.object({
    id: idSchema,
    type: z.literal("gallery"),
    heading: headingSchema,
    animation: animationSchema,
    images: z.array(z.object({
      id: idSchema,
      url: z.string().trim().max(2_000),
      alt: z.string().trim().max(200).optional(),
    })).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("embed"),
    heading: headingSchema,
    animation: animationSchema,
    url: z.string().trim().max(2_000),
    height: z.number().min(100).max(800).optional(),
  }),
  z.object({
    id: idSchema,
    type: z.literal("social"),
    heading: headingSchema,
    animation: animationSchema,
    links: z.array(z.object({
      id: idSchema,
      platform: z.string().trim().max(40),
      url: z.string().trim().max(2_000),
    })).max(10),
  }),
  z.object({
    id: idSchema,
    type: z.literal("cta"),
    heading: headingSchema,
    animation: animationSchema,
    text: z.string().trim().max(500),
    buttonLabel: z.string().trim().max(60),
    buttonUrl: optionalPublicHrefSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("divider"),
    heading: headingSchema,
    animation: animationSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("collapsible"),
    heading: headingSchema,
    animation: animationSchema,
    items: z.array(z.object({
      id: idSchema,
      title: z.string().trim().min(1).max(200),
      content: z.string().trim().min(1).max(2_000),
    })).max(12),
  }),
  z.object({
    id: idSchema,
    type: z.literal("spacer"),
    heading: headingSchema,
    animation: animationSchema,
    height: z.number().min(16).max(200).optional(),
  }),
  z.object({
    id: idSchema,
    type: z.literal("tableOfContents"),
    heading: headingSchema,
    animation: animationSchema,
  }),
  z.object({
    id: idSchema,
    type: z.literal("contentBlock"),
    heading: headingSchema,
    animation: animationSchema,
    columns: z.number().min(2).max(4),
    layout: z.enum(["equal", "left-heavy", "right-heavy", "thirds"]),
    items: z.array(z.object({
      id: idSchema,
      content: z.string().trim().max(2_000),
    })).max(4),
  }),
]);

export type PersonalSiteSection = z.infer<typeof personalSiteSectionSchema>;

export const personalSiteLinkSchema = z.object({
  id: idSchema,
  label: z.string().trim().min(1).max(80),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2_000)
    .refine(isSafePublicHref, "Gunakan URL publik yang aman"),
});

export type PersonalSiteLink = z.infer<typeof personalSiteLinkSchema>;

export const themeConfigSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  fontHeading: z.string().max(60).optional(),
  fontBody: z.string().max(60).optional(),
  headerStyle: z.enum(PERSONAL_SITE_HEADER_STYLES).optional(),
  buttonStyle: z.enum(PERSONAL_SITE_BUTTON_STYLES).optional(),
});

export type ThemeConfig = z.infer<typeof themeConfigSchema>;

export const personalSitePageSchema = z.object({
  id: idSchema,
  slug: z.string().trim().max(48).regex(/^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(100),
  isHome: z.boolean(),
  sections: z.array(personalSiteSectionSchema).max(12),
});

export type PersonalSitePage = z.infer<typeof personalSitePageSchema>;

export const personalSiteInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug hanya boleh memakai huruf kecil, angka, dan tanda hubung")
    .refine((slug) => !RESERVED_PERSONAL_SITE_SLUGS.has(slug), "Slug ini dicadangkan Cubiqlo"),
  published: z.boolean(),
  title: z.string().trim().min(1).max(100),
  subtitle: shortTextSchema,
  hero: z.string().trim().min(1).max(500),
  heroImage: z.string().trim().max(2_000).nullish(),
  about: z.string().trim().max(2_000),
  ctaLabel: z.string().trim().max(60),
  ctaUrl: optionalPublicHrefSchema,
  theme: z.enum(PERSONAL_SITE_THEMES),
  accent: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Gunakan warna hex enam digit"),
  sections: z.array(personalSiteSectionSchema).max(12),
  links: z.array(personalSiteLinkSchema).max(8),
  pages: z.array(personalSitePageSchema).max(10).optional(),
  themeConfig: themeConfigSchema.nullish(),
});

export type PersonalSiteInput = z.infer<typeof personalSiteInputSchema>;

export const DEFAULT_PERSONAL_SITE: PersonalSiteInput = {
  slug: "my-studio",
  published: false,
  title: "Nama atau studio kamu",
  subtitle: "Freelancer · Studio · Consultant",
  hero: "Jelaskan hasil utama yang kamu bantu capai untuk klien.",
  about: "Ceritakan keahlian, cara kerja, dan tipe klien yang paling cocok bekerja dengan kamu.",
  ctaLabel: "Hubungi saya",
  ctaUrl: "",
  theme: "midnight",
  accent: "#6647F0",
  sections: [
    {
      id: "default-services",
      type: "services",
      heading: "Layanan",
      items: [
        { id: "default-service-1", title: "Layanan utama", description: "Jelaskan hasil dan ruang lingkup singkat." },
      ],
    },
    {
      id: "default-process",
      type: "process",
      heading: "Cara kerja",
      steps: [
        { id: "default-step-1", title: "Diskusi", description: "Samakan tujuan, kebutuhan, dan ruang lingkup." },
        { id: "default-step-2", title: "Eksekusi", description: "Kerjakan dengan checkpoint yang jelas." },
      ],
    },
  ],
  links: [],
  pages: [{
    id: "home",
    slug: "",
    title: "Home",
    isHome: true,
    sections: [],
  }],
  themeConfig: {
    primaryColor: "#6647F0",
    secondaryColor: "#1e293b",
    backgroundColor: "#ffffff",
    textColor: "#111827",
    headerStyle: "full-width",
    buttonStyle: "rounded",
  },
};

export function normalizePersonalSiteSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function isSafePublicHref(value: string) {
  const href = value.trim();
  if (!href) return false;
  if (/^(javascript|data|vbscript):/i.test(href)) return false;
  if (/^\/app(?:\/|$)/i.test(href)) return false;
  if (/^\/(?:booking|intake|site)\/[a-z0-9][a-z0-9/_?=&.%+-]*$/i.test(href)) return true;
  if (/^(?:mailto:|tel:)/i.test(href)) return href.length > href.indexOf(":") + 1;
  try {
    const url = new URL(href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function safePublicHref(value: string) {
  return isSafePublicHref(value) ? value.trim() : "#";
}

export function accentForeground(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "6647F0";
  const [r, g, b] = [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
}

function lineItems(content: string) {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function legacySection(section: unknown, index: number): PersonalSiteSection | null {
  if (!section || typeof section !== "object") return null;
  const raw = section as Record<string, unknown>;
  const type = PERSONAL_SITE_SECTION_TYPES.includes(raw.type as (typeof PERSONAL_SITE_SECTION_TYPES)[number])
    ? (raw.type as (typeof PERSONAL_SITE_SECTION_TYPES)[number])
    : "custom";
  const heading = String(raw.heading || "Section").slice(0, 80);
  const content = String(raw.content || "");
  const id = String(raw.id || `legacy-${index + 1}`);
  const rows = lineItems(content);

  const alreadyTyped = personalSiteSectionSchema.safeParse(raw);
  if (alreadyTyped.success) return alreadyTyped.data;

  switch (type) {
    case "services":
      return { id, type, heading, items: rows.map((title, i) => ({ id: `${id}-service-${i}`, title: title.slice(0, 100), description: "" })) };
    case "process":
      return { id, type, heading, steps: rows.map((line, i) => {
        const cleaned = line.replace(/^\d+[.)]\s*/, "");
        const [title, ...rest] = cleaned.split(/\s+[—–-]\s+/);
        return { id: `${id}-step-${i}`, title: (title || `Step ${i + 1}`).slice(0, 100), description: rest.join(" — ").slice(0, 1_000) };
      }) };
    case "pricing":
      return { id, type, heading, offers: rows.map((line, i) => {
        const [name, ...rest] = line.split(":");
        return { id: `${id}-offer-${i}`, name: (name || line).slice(0, 100), price: rest.join(":").trim().slice(0, 80), description: "" };
      }) };
    case "portfolio":
      return { id, type, heading, projects: rows.map((line, i) => ({ id: `${id}-project-${i}`, title: line.slice(0, 120), description: "", url: "" })) };
    case "testimonials":
      return content.trim() ? { id, type, heading, testimonials: [{ id: `${id}-quote-0`, quote: content.trim().slice(0, 1_000), author: "", role: "" }] } : { id, type, heading, testimonials: [] };
    case "faq":
      return { id, type, heading, items: [] };
    case "contact":
      return { id, type, heading, methods: rows.map((line, i) => {
        const [label, ...rest] = line.split(":");
        const value = rest.join(":").trim();
        return { id: `${id}-contact-${i}`, label: (label || "Contact").slice(0, 80), value: value.slice(0, 160), url: "" };
      }) };
    default:
      return { id, type: "custom", heading, content: content.slice(0, 4_000) };
  }
}

export function normalizeLegacySections(value: unknown): PersonalSiteSection[] {
  const rawSections = typeof value === "string"
    ? lineItems(value).map((line, index) => {
        const [heading, ...content] = line.split("|");
        return { id: `legacy-${index + 1}`, type: "custom", heading: heading || "Section", content: content.join("|") };
      })
    : Array.isArray(value)
      ? value
      : [];
  return rawSections
    .map(legacySection)
    .filter((section): section is PersonalSiteSection => Boolean(section))
    .slice(0, 12);
}

export function normalizeLegacyLinks(value: unknown): PersonalSiteLink[] {
  const rows = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? lineItems(value).map((line, index) => {
          const [label, ...url] = line.split("=");
          return { id: `legacy-link-${index + 1}`, label, url: url.join("=") };
        })
      : [];

  return rows
    .map((row, index) => {
      if (!row || typeof row !== "object") return null;
      const item = row as Record<string, unknown>;
      const candidate = {
        id: String(item.id || `legacy-link-${index + 1}`),
        label: String(item.label || "Link"),
        url: String(item.url || ""),
      };
      const parsed = personalSiteLinkSchema.safeParse(candidate);
      return parsed.success ? parsed.data : null;
    })
    .filter((link): link is PersonalSiteLink => Boolean(link))
    .slice(0, 8);
}

export function normalizeStoredPersonalSite(value: unknown): PersonalSiteInput {
  const raw = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const candidate = {
    ...DEFAULT_PERSONAL_SITE,
    ...raw,
    slug: normalizePersonalSiteSlug(String(raw.slug || DEFAULT_PERSONAL_SITE.slug)),
    published: Boolean(raw.published),
    theme: PERSONAL_SITE_THEMES.includes(raw.theme as (typeof PERSONAL_SITE_THEMES)[number])
      ? raw.theme
      : raw.background === "Paper" ? "paper" : "midnight",
    sections: normalizeLegacySections(raw.sections),
    links: normalizeLegacyLinks(raw.links),
    pages: Array.isArray(raw.pages) ? raw.pages : DEFAULT_PERSONAL_SITE.pages,
    themeConfig: raw.themeConfig && typeof raw.themeConfig === "object" ? raw.themeConfig : undefined,
  };
  const parsed = personalSiteInputSchema.safeParse(candidate);
  if (!parsed.success) {
    console.error("normalizeStoredPersonalSite FAILED:", JSON.stringify(parsed.error.issues.slice(0,3)));
  }
  return parsed.success ? parsed.data : DEFAULT_PERSONAL_SITE;
}

export function sectionHasContent(section: PersonalSiteSection) {
  switch (section.type) {
    case "services": return section.items.some((item) => item.title || item.description);
    case "process": return section.steps.some((item) => item.title || item.description);
    case "pricing": return section.offers.some((item) => item.name || item.price || item.description);
    case "portfolio": return section.projects.some((item) => item.title || item.description || item.url);
    case "testimonials": return section.testimonials.some((item) => item.quote && (item.author || item.role));
    case "faq": return section.items.some((item) => item.question && item.answer);
    case "contact": return section.methods.some((item) => item.label && (item.value || item.url));
    case "custom": return Boolean(section.content.trim());
    case "gallery": return section.images.some((img) => img.url);
    case "embed": return Boolean(section.url.trim());
    case "social": return section.links.some((link) => link.url);
    case "cta": return Boolean(section.text.trim()) || Boolean(section.buttonLabel.trim());
    case "divider": return true;
    case "collapsible": return section.items.some((item) => item.title && item.content);
    case "spacer": return true;
    case "tableOfContents": return true;
    case "contentBlock": return section.items.some((item) => item.content.trim());
  }
}
