import { redirect } from "next/navigation";
import { createPersonalNote, listPersonalNotes, updatePersonalNote } from "@/lib/actions/personal-notes";
import { BuilderClient } from "@/components/site/builder-client";
import type { SiteSection } from "@/components/site/section-editor";

const KEY = "[site]";

type SiteData = {
  slug: string;
  published: boolean;
  title: string;
  subtitle: string;
  hero: string;
  about: string;
  ctaLabel: string;
  ctaUrl: string;
  background: string;
  accent: string;
  sections: SiteSection[];
  links: string;
};

const defaults: SiteData = {
  slug: "alip",
  published: true,
  title: "Your Name / Studio",
  subtitle: "Freelancer · Agency · Consultant",
  hero: "Simple client-facing landing page for your services.",
  about: "Tell clients what you do, who you help, and why they should work with you.",
  ctaLabel: "Book a call",
  ctaUrl: "/app/calendar",
  background: "Indigo gradient",
  accent: "#7c3aed",
  sections: [
    { id: "1", type: "services", heading: "Services", content: "Website, automation, design, and consulting." },
    { id: "2", type: "process", heading: "Process", content: "Discovery, build, review, launch." },
    { id: "3", type: "pricing", heading: "Pricing", content: "Project packages start from your custom offer." },
  ],
  links: "Portfolio=https://example.com\nEmail=mailto:hello@example.com",
};

function parseSite(body?: string | null): SiteData {
  try {
    const parsed = JSON.parse(body || "{}");
    // Migrate old string sections to new format
    if (typeof parsed.sections === "string") {
      parsed.sections = parsed.sections
        .split("\n")
        .filter(Boolean)
        .map((line: string, i: number) => {
          const [heading, ...contentParts] = line.split("|");
          return {
            id: String(i + 1),
            type: "custom",
            heading: heading?.trim() || "Untitled",
            content: contentParts.join("|").trim(),
          };
        });
    }
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "alip";
}

export default async function PersonalSiteBuilderPage() {
  const existing = (
    await listPersonalNotes(KEY, { includeSystem: true, status: "all" })
  ).find((note) => note.title === KEY);
  const site = parseSite(existing?.body);
  const publicUrl = `/site/${site.slug || defaults.slug}`;

  async function saveSite(formData: FormData) {
    "use server";
    let sections: SiteSection[] = defaults.sections;
    try {
      sections = JSON.parse(String(formData.get("sections") || "[]"));
    } catch {
      // fallback to defaults
    }

    const payload: SiteData = {
      slug: slugify(String(formData.get("slug") || defaults.slug)),
      published: formData.get("published") === "on",
      title: String(formData.get("title") || defaults.title),
      subtitle: String(formData.get("subtitle") || defaults.subtitle),
      hero: String(formData.get("hero") || defaults.hero),
      about: String(formData.get("about") || defaults.about),
      ctaLabel: String(formData.get("ctaLabel") || defaults.ctaLabel),
      ctaUrl: String(formData.get("ctaUrl") || defaults.ctaUrl),
      background: String(formData.get("background") || defaults.background),
      accent: String(formData.get("accent") || defaults.accent),
      sections,
      links: String(formData.get("links") || defaults.links),
    };
    const body = JSON.stringify(payload, null, 2);
    const current = (
      await listPersonalNotes(KEY, { includeSystem: true, status: "all" })
    ).find((note) => note.title === KEY);
    if (current) {
      await updatePersonalNote(current.id, {
        title: KEY,
        body,
        pinned: true,
        recurrenceRule: "none",
        notify7d: false,
        notify3d: false,
        notify1d: false,
      });
    } else {
      await createPersonalNote({
        title: KEY,
        body,
        pinned: true,
        recurrenceRule: "none",
        notify7d: false,
        notify3d: false,
        notify1d: false,
      });
    }
    redirect("/app/personal-site");
  }

  return <BuilderClient initialSite={site} defaults={defaults} publicUrl={publicUrl} action={saveSite} />;
}
