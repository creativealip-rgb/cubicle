import { redirect } from "next/navigation";
import { createPersonalNote, listPersonalNotes, updatePersonalNote } from "@/lib/actions/personal-notes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionEditorForm } from "@/components/site/section-editor-form";
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

const sectionTypes = [
  { value: "services", label: "Services" },
  { value: "process", label: "Process" },
  { value: "pricing", label: "Pricing" },
  { value: "portfolio", label: "Portfolio" },
  { value: "testimonials", label: "Testimonials" },
  { value: "faq", label: "FAQ" },
  { value: "contact", label: "Contact" },
  { value: "custom", label: "Custom" },
];

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

function safeHref(value?: string) {
  const href = (value || "#").trim();
  if (!href) return "#";
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `https://${href}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "alip";
}

function parseRows(text: string, divider: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, ...bodyParts] = line.split(divider);
      return { label: label?.trim() || "Untitled", body: bodyParts.join(divider).trim() };
    });
}

export default async function PersonalSiteBuilderPage() {
  const existing = (await listPersonalNotes(KEY)).find((note) => note.title === KEY);
  const site = parseSite(existing?.body);
  const accent = site.accent || defaults.accent;
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
    const current = (await listPersonalNotes(KEY)).find((note) => note.title === KEY);
    if (current) {
      await updatePersonalNote(current.id, { title: KEY, body, pinned: true });
    } else {
      await createPersonalNote({ title: KEY, body, pinned: true });
    }
    redirect("/app/personal-site");
  }

  const parsedLinks = parseRows(site.links, "=").map((link) => ({ label: link.label, url: safeHref(link.body) }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personal Landing Page Builder</h1>
          <p className="mt-1 text-sm text-muted-foreground">Edit konten, tambah section, atur CTA/link, lalu lihat preview kanan.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><a href="#preview">Jump to preview</a></Button>
          <Button asChild><a href={publicUrl} target="_blank" rel="noreferrer">Open live page</a></Button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[460px_1fr]">
        <Card className="h-fit">
          <CardHeader><CardTitle>Builder controls</CardTitle></CardHeader>
          <CardContent>
            <form action={saveSite} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2"><label className="text-sm font-medium">Public slug</label><Input name="slug" defaultValue={site.slug} placeholder="alip" /></div>
                <label className="mt-8 flex items-center gap-2 text-sm font-medium"><input name="published" type="checkbox" defaultChecked={site.published} /> Published</label>
              </div>
              <p className="text-xs text-muted-foreground">Live URL: https://cubiqlo.com{publicUrl}</p>
              <div className="space-y-2"><label className="text-sm font-medium">Title</label><Input name="title" defaultValue={site.title} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Subtitle / tagline</label><Input name="subtitle" defaultValue={site.subtitle} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Hero text</label><Textarea name="hero" rows={3} defaultValue={site.hero} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">About</label><Textarea name="about" rows={5} defaultValue={site.about} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">CTA label</label><Input name="ctaLabel" defaultValue={site.ctaLabel} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">CTA URL</label><Input name="ctaUrl" defaultValue={site.ctaUrl} placeholder="/app/calendar or https://..." /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">Theme name</label><Input name="background" defaultValue={site.background} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Accent color</label><Input name="accent" defaultValue={site.accent} placeholder="#7c3aed" /></div>
              </div>
              <div className="space-y-2">
                <SectionEditorForm initialSections={site.sections} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Links</label>
                <Textarea name="links" rows={5} defaultValue={site.links} placeholder="Label=https://url.com" />
                <p className="text-xs text-muted-foreground">Tambah link per baris: Label=https://url.com. Support mailto: dan tel:.</p>
              </div>
              <Button type="submit" className="w-full">Save landing page</Button>
            </form>
          </CardContent>
        </Card>

        <Card id="preview" className="overflow-hidden">
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white md:p-12">
            <div className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-100">{site.background}</div>
            <p className="mt-6 text-sm uppercase tracking-[0.2em] text-indigo-200">{site.subtitle}</p>
            <h2 className="mt-4 max-w-4xl text-4xl font-bold tracking-tight md:text-6xl">{site.title}</h2>
            <p className="mt-5 max-w-2xl text-lg text-slate-200">{site.hero}</p>
            <Button className="mt-6 text-white hover:opacity-90" style={{ backgroundColor: accent }} asChild><a href={safeHref(site.ctaUrl)}>{site.ctaLabel}</a></Button>
          </div>
          <CardContent className="space-y-8 p-8">
            <section>
              <h3 className="text-lg font-semibold">About</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{site.about}</p>
            </section>

            <section>
              <h3 className="text-lg font-semibold">Sections</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {site.sections.map((section) => (
                  <div key={section.id} className="rounded-xl border bg-card p-4 shadow-sm">
                    <div className="mb-3 h-1 w-10 rounded-full" style={{ backgroundColor: accent }} />
                    <h4 className="font-semibold">{section.heading}</h4>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{section.content || "Add content in builder."}</p>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold">Links</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {parsedLinks.map((link, index) => (
                  <Button key={`${link.label}-${index}`} variant="outline" size="sm" asChild><a href={link.url}>{link.label}</a></Button>
                ))}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
