"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionEditor, type SiteSection } from "./section-editor";
import { PresetPicker, PreviewToggle, type SitePreset } from "./site-presets";
import { checkSlugUnique } from "@/lib/actions/personal-site";
import { Monitor, Smartphone } from "lucide-react";

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

function safeHref(value?: string) {
  const href = (value || "#").trim();
  if (!href) return "#";
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return href;
  if (href.startsWith("http://") || href.startsWith("https://")) return href;
  return `https://${href}`;
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

interface BuilderClientProps {
  initialSite: SiteData;
  defaults: SiteData;
  publicUrl: string;
  action: (formData: FormData) => void;
}

export function BuilderClient({ initialSite, defaults, publicUrl, action }: BuilderClientProps) {
  const [site, setSite] = useState<SiteData>(initialSite);
  const [sections, setSections] = useState<SiteSection[]>(initialSite.sections);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [slugTimer, setSlugTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const accent = site.accent || defaults.accent;
  const parsedLinks = parseRows(site.links, "=").map((link) => ({ label: link.label, url: safeHref(link.body) }));

  const updateField = useCallback(<K extends keyof SiteData>(key: K, value: SiteData[K]) => {
    setSite((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSlugChange = useCallback(
    (value: string) => {
      updateField("slug", value);
      setSlugStatus("idle");
      if (slugTimer) clearTimeout(slugTimer);
      const timer = setTimeout(async () => {
        const clean = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 48);
        if (!clean || clean === initialSite.slug) {
          setSlugStatus("idle");
          return;
        }
        setSlugStatus("checking");
        const unique = await checkSlugUnique(clean);
        setSlugStatus(unique ? "ok" : "taken");
      }, 600);
      setSlugTimer(timer);
    },
    [initialSite.slug, slugTimer, updateField]
  );

  const applyPreset = useCallback(
    (preset: SitePreset) => {
      setSections(preset.sections);
      setSite((prev) => ({
        ...prev,
        subtitle: preset.subtitle,
        hero: preset.hero,
        about: preset.about,
        ctaLabel: preset.ctaLabel,
      }));
    },
    []
  );

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
        {/* ── Builder controls ── */}
        <Card className="h-fit">
          <CardHeader><CardTitle>Builder controls</CardTitle></CardHeader>
          <CardContent>
            <form action={action} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Public slug</label>
                  <Input
                    name="slug"
                    defaultValue={site.slug}
                    placeholder="alip"
                    onChange={(e) => handleSlugChange(e.target.value)}
                  />
                  {slugStatus === "checking" && <p className="text-xs text-muted-foreground">Checking...</p>}
                  {slugStatus === "ok" && <p className="text-xs text-green-600">✓ Slug available</p>}
                  {slugStatus === "taken" && <p className="text-xs text-red-600">✗ Slug already taken</p>}
                </div>
                <label className="mt-8 flex items-center gap-2 text-sm font-medium"><input name="published" type="checkbox" defaultChecked={site.published} onChange={(e) => updateField("published", e.target.checked)} /> Published</label>
              </div>
              <p className="text-xs text-muted-foreground">Live URL: https://cubiqlo.com{publicUrl}</p>

              {/* Template presets */}
              <PresetPicker onSelect={applyPreset} />

              <div className="space-y-2"><label className="text-sm font-medium">Title</label><Input name="title" defaultValue={site.title} onChange={(e) => updateField("title", e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Subtitle / tagline</label><Input name="subtitle" defaultValue={site.subtitle} onChange={(e) => updateField("subtitle", e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Hero text</label><Textarea name="hero" rows={3} defaultValue={site.hero} onChange={(e) => updateField("hero", e.target.value)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">About</label><Textarea name="about" rows={5} defaultValue={site.about} onChange={(e) => updateField("about", e.target.value)} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">CTA label</label><Input name="ctaLabel" defaultValue={site.ctaLabel} onChange={(e) => updateField("ctaLabel", e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">CTA URL</label><Input name="ctaUrl" defaultValue={site.ctaUrl} placeholder="/app/calendar or https://..." onChange={(e) => updateField("ctaUrl", e.target.value)} /></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2"><label className="text-sm font-medium">Theme name</label><Input name="background" defaultValue={site.background} onChange={(e) => updateField("background", e.target.value)} /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Accent color</label><Input name="accent" defaultValue={site.accent} placeholder="#7c3aed" onChange={(e) => updateField("accent", e.target.value)} /></div>
              </div>
              <div className="space-y-2">
                <SectionEditor sections={sections} onChange={setSections} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Links</label>
                <Textarea name="links" rows={5} defaultValue={site.links} placeholder="Label=https://url.com" onChange={(e) => updateField("links", e.target.value)} />
                <p className="text-xs text-muted-foreground">Tambah link per baris: Label=https://url.com. Support mailto: dan tel:.</p>
              </div>
              <input type="hidden" name="sections" value={JSON.stringify(sections)} />
              <Button type="submit" className="w-full">Save landing page</Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Preview ── */}
        <div id="preview" className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">Preview</h3>
            <PreviewToggle mode={previewMode} onChange={setPreviewMode} />
          </div>
          <Card className={`overflow-hidden mx-auto transition-all duration-300 ${previewMode === "mobile" ? "max-w-[375px]" : "max-w-full"}`}>
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-8 text-white md:p-12">
              <div className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-indigo-100">{site.background}</div>
              <p className="mt-6 text-sm uppercase tracking-[0.2em] text-indigo-200">{site.subtitle}</p>
              <h2 className={`mt-4 font-bold tracking-tight ${previewMode === "mobile" ? "text-2xl" : "max-w-4xl text-4xl md:text-6xl"}`}>{site.title}</h2>
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
                <div className={`mt-4 grid gap-3 ${previewMode === "mobile" ? "grid-cols-1" : "md:grid-cols-2"}`}>
                  {sections.map((section) => (
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
    </div>
  );
}
