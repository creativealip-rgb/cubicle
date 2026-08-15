"use client";

import { useState } from "react";
import { Plus, FileText, Layers, Palette, Eye, ChevronLeft, ChevronRight, Trash2, Home, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PersonalSiteInput, PersonalSiteSection, PersonalSitePage } from "@/lib/personal-site/model";
import { normalizePersonalSiteSlug } from "@/lib/personal-site/model";
import { SECTION_TEMPLATES, type SectionTemplate } from "@/lib/personal-site/section-templates";
import { SEOPanel } from "./seo-panel";
import { ReadinessBadge } from "../readiness-badge";
import { isReadyToPublish, getPersonalSiteReadiness } from "@/lib/personal-site/readiness";
import { useT } from "@/lib/i18n-client";

const STEPS = ["pages", "sections", "theme", "publish"] as const;
type Step = typeof STEPS[number];

const STEP_ICONS: Record<Step, typeof FileText> = {
  pages: FileText,
  sections: Layers,
  theme: Palette,
  publish: Eye,
};

const STEP_LABELS: Record<Step, { id: string; en: string }> = {
  pages: { id: "Halaman", en: "Pages" },
  sections: { id: "Bagian", en: "Sections" },
  theme: { id: "Tema", en: "Theme" },
  publish: { id: "Terbitkan", en: "Publish" },
};

function slugifyPageTitle(title: string, fallback: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || fallback;
}

function makeId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

const PRESET_THEMES = [
  { name: "Midnight", theme: "midnight" as const, accent: "#6647F0", primary: "#6647F0", bg: "#0f172a", text: "#e2e8f0" },
  { name: "Paper", theme: "paper" as const, accent: "#404040", primary: "#404040", bg: "#ffffff", text: "#171717" },
  { name: "Studio", theme: "studio" as const, accent: "#6647F0", primary: "#6647F0", bg: "#fafafa", text: "#111827" },
  { name: "Ocean", theme: "ocean" as const, accent: "#0ea5e9", primary: "#0ea5e9", bg: "#f0f9ff", text: "#0c4a6e" },
  { name: "Forest", theme: "forest" as const, accent: "#16a34a", primary: "#16a34a", bg: "#f0fdf4", text: "#14532d" },
  { name: "Sunset", theme: "sunset" as const, accent: "#ea580c", primary: "#ea580c", bg: "#fff7ed", text: "#7c2d12" },
  { name: "Rose", theme: "rose" as const, accent: "#e11d48", primary: "#e11d48", bg: "#fff1f2", text: "#881337" },
  { name: "Dark", theme: "dark" as const, accent: "#a78bfa", primary: "#a78bfa", bg: "#030712", text: "#e5e7eb" },
];

type Props = {
  site: PersonalSiteInput;
  activePageId: string;
  selectedSectionId: string | null;
  publicSiteBaseUrl: string;
  previewUrl: string;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
  onSetActivePageId: (id: string) => void;
  onSelectSection: (id: string | null) => void;
};

export function MobileStepEditor({
  site,
  activePageId,
  selectedSectionId,
  publicSiteBaseUrl,
  previewUrl,
  onUpdateSite,
  onSetActivePageId,
  onSelectSection,
}: Props) {
  const { t } = useT();
  const [step, setStep] = useState<Step>("pages");
  const stepIndex = STEPS.indexOf(step);
  const publicUrl = `${publicSiteBaseUrl}/${normalizePersonalSiteSlug(site.slug)}`;

  const pages = site.pages?.length ? site.pages : [{ id: "home", slug: "", title: "Home", isHome: true, sections: site.sections }];
  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const sections = activePage.sections;

  function updatePages(nextPages: PersonalSitePage[]) {
    const normalized = nextPages.map((p, i) => ({ ...p, isHome: p.isHome || (i === 0 && !nextPages.some((pp) => pp.isHome)) }));
    onUpdateSite({ pages: normalized, sections: normalized.find((p) => p.isHome)?.sections ?? normalized[0]?.sections ?? [] });
  }

  function addSection(templateOrType: SectionTemplate | string) {
    const newSection = typeof templateOrType === "string"
      ? { id: makeId(), type: templateOrType as PersonalSiteSection["type"], heading: "Section" } as PersonalSiteSection
      : templateOrType.build();
    const nextSections = [...sections, newSection];
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: nextSections } : p);
    updatePages(nextPages);
  }

  function deleteSection(id: string) {
    const nextSections = sections.filter((s) => s.id !== id);
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: nextSections } : p);
    updatePages(nextPages);
    if (selectedSectionId === id) onSelectSection(null);
  }

  function reorderSections(from: number, to: number) {
    const next = [...sections];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: next } : p);
    updatePages(nextPages);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Step indicator */}
      <div className="flex items-center gap-1 px-4 py-3 border-b bg-muted/30">
        {STEPS.map((s, i) => {
          const Icon = STEP_ICONS[s];
          const active = s === step;
          const done = i < stepIndex;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStep(s)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}
            >
              <Icon className="h-3 w-3" />
              {t(STEP_LABELS[s].id, STEP_LABELS[s].en)}
            </button>
          );
        })}
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        {step === "pages" && (
          <PagesStep
            pages={pages}
            activePageId={activePageId}
            onSetActivePageId={onSetActivePageId}
            updatePages={updatePages}
          />
        )}

        {step === "sections" && (
          <SectionsStep
            sections={sections}
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            addSection={addSection}
            deleteSection={deleteSection}
            reorderSections={reorderSections}
          />
        )}

        {step === "theme" && (
          <ThemeStep
            site={site}
            onUpdateSite={onUpdateSite}
          />
        )}

        {step === "publish" && (
          <PublishStep
            site={site}
            publicUrl={publicUrl}
            previewUrl={previewUrl}
            onUpdateSite={onUpdateSite}
          />
        )}
      </div>

      {/* Bottom nav */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-background">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(STEPS[Math.max(0, stepIndex - 1)])}
          disabled={stepIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> {t("Kembali", "Back")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("Langkah", "Step")} {stepIndex + 1} / {STEPS.length}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep(STEPS[Math.min(STEPS.length - 1, stepIndex + 1)])}
          disabled={stepIndex === STEPS.length - 1}
        >
          {t("Lanjut", "Next")} <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function PagesStep({ pages, activePageId, onSetActivePageId, updatePages }: {
  pages: PersonalSitePage[];
  activePageId: string;
  onSetActivePageId: (id: string) => void;
  updatePages: (pages: PersonalSitePage[]) => void;
}) {
  function addPage() {
    const id = makeId().replace(/^s_/, "p_");
    const title = `${t("Halaman", "Page")} ${pages.length + 1}`;
    updatePages([...pages, { id, slug: slugifyPageTitle(title, `page-${pages.length + 1}`), title, isHome: false, sections: [] }]);
    onSetActivePageId(id);
  }

  const { t } = useT();
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{t("Halaman", "Pages")}</h2>
      {pages.map((page, _i) => (
        <div key={page.id} className={`flex items-center gap-2 rounded-lg border p-3 ${page.id === activePageId ? "border-primary/60 bg-primary/5" : ""}`}>
          <button type="button" className="flex-1 text-left" onClick={() => onSetActivePageId(page.id)}>
            <p className="text-sm font-medium">{page.title}</p>
            <p className="text-xs text-muted-foreground">/{page.slug || ""} {page.isHome ? `· ${t("Beranda", "Home")}` : ""}</p>
          </button>
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8"
              onClick={() => {
                const next = pages.map((p) => ({ ...p, isHome: p.id === page.id, slug: p.id === page.id ? "" : p.slug }));
                updatePages(next);
              }}
              disabled={page.isHome}
            >
              <Home className="h-3.5 w-3.5" />
            </Button>
            {pages.length > 1 && (
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => {
                  const next = pages.filter((p) => p.id !== page.id);
                  if (!next.some((p) => p.isHome)) next[0] = { ...next[0], isHome: true, slug: "" };
                  updatePages(next);
                  if (activePageId === page.id) onSetActivePageId(next[0].id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addPage}>
        <Plus className="h-3.5 w-3.5 mr-1" /> {t("Tambah Halaman", "Add Page")}
      </Button>
    </div>
  );
}

function SectionsStep({ sections, selectedSectionId, onSelectSection, addSection, deleteSection, reorderSections }: {
  sections: PersonalSiteSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  addSection: (t: SectionTemplate | string) => void;
  deleteSection: (id: string) => void;
  reorderSections: (from: number, to: number) => void;
}) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{t("Bagian", "Sections")} ({sections.length})</h2>

      {/* Section list */}
      <div className="space-y-1">
        {sections.map((section, i) => (
          <div key={section.id} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${selectedSectionId === section.id ? "border-primary/60 bg-primary/5" : ""}`}>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => reorderSections(i, i - 1)}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" disabled={i === sections.length - 1} onClick={() => reorderSections(i, i + 1)}>↓</Button>
            </div>
            <button type="button" className="flex-1 text-left truncate" onClick={() => onSelectSection(section.id)}>
              {section.heading || section.type}
            </button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => deleteSection(section.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">{t("Belum ada bagian. Tambahkan dari bawah.", "No sections yet. Add one below.")}</p>
        )}
      </div>

      {/* Add section buttons */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("Tambah Bagian", "Add Section")}</h3>
        <div className="grid grid-cols-2 gap-1.5">
          {SECTION_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => addSection(template)}
              className="flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] hover:bg-muted transition-colors"
            >
              <Layers className="h-3 w-3 text-muted-foreground" />
              <span className="line-clamp-2">{t(template.label, SECTION_TEMPLATE_EN[template.label] ?? template.label)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const SECTION_TEMPLATE_EN: Record<string, string> = { "Layanan 3 Kartu": "3 Service Cards", "Pengembangan Software": "Software Development", "Proses 3 Langkah": "3-Step Process", "Metode Agile": "Agile Method", "Pricing 3 Paket": "3-Tier Pricing", "SaaS Pricing Tier": "SaaS Pricing Tiers", "FAQ 5 Pertanyaan": "5-Question FAQ", "FAQ Freelancer": "Freelancer FAQ", "CTA Utama": "Primary CTA", "CTA Kontak": "Contact CTA", "Testimoni 3 Klien": "3-Client Testimonials", "Portfolio Gallery": "Portfolio Gallery", "Embed Video": "Video Embed" };

function ThemeStep({ site, onUpdateSite }: {
  site: PersonalSiteInput;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
}) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{t("Tema", "Theme")}</h2>

      <div className="grid grid-cols-2 gap-2">
        {PRESET_THEMES.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => onUpdateSite({
              theme: preset.theme,
              accent: preset.accent,
              themeConfig: {
                primaryColor: preset.primary,
                secondaryColor: site.themeConfig?.secondaryColor ?? "#1e293b",
                backgroundColor: preset.bg,
                textColor: preset.text,
                ...(site.themeConfig?.fontHeading ? { fontHeading: site.themeConfig.fontHeading } : {}),
                ...(site.themeConfig?.fontBody ? { fontBody: site.themeConfig.fontBody } : {}),
                headerStyle: site.themeConfig?.headerStyle ?? "full-width",
                buttonStyle: site.themeConfig?.buttonStyle ?? "rounded",
              },
            })}
            className={`flex items-center gap-2 rounded-lg border p-3 text-xs transition-colors ${
              site.theme === preset.theme ? "border-primary bg-primary/5" : "hover:bg-muted"
            }`}
          >
            <div className="flex shrink-0">
              <div className="h-5 w-5 rounded-l" style={{ backgroundColor: preset.primary }} />
              <div className="h-5 w-5 rounded-r border" style={{ backgroundColor: preset.bg }} />
            </div>
            <span className="font-medium">{preset.name}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-border" />

      <div className="space-y-2">
        <Label className="text-xs">{t("Warna Utama", "Primary Color")}</Label>
        <div className="flex gap-2">
          <input type="color" value={site.themeConfig?.primaryColor ?? "#6647F0"}
            onChange={(e) => onUpdateSite({
              themeConfig: {
                primaryColor: e.target.value,
                secondaryColor: site.themeConfig?.secondaryColor ?? "#1e293b",
                backgroundColor: site.themeConfig?.backgroundColor ?? "#ffffff",
                textColor: site.themeConfig?.textColor ?? "#111827",
                ...(site.themeConfig?.fontHeading ? { fontHeading: site.themeConfig.fontHeading } : {}),
                ...(site.themeConfig?.fontBody ? { fontBody: site.themeConfig.fontBody } : {}),
                headerStyle: site.themeConfig?.headerStyle ?? "full-width",
                buttonStyle: site.themeConfig?.buttonStyle ?? "rounded",
              },
              accent: e.target.value,
            })}
            className="h-9 w-9 rounded border" />
          <Input value={site.themeConfig?.primaryColor ?? "#6647F0"}
            onChange={(e) => onUpdateSite({
              themeConfig: {
                primaryColor: e.target.value,
                secondaryColor: site.themeConfig?.secondaryColor ?? "#1e293b",
                backgroundColor: site.themeConfig?.backgroundColor ?? "#ffffff",
                textColor: site.themeConfig?.textColor ?? "#111827",
                ...(site.themeConfig?.fontHeading ? { fontHeading: site.themeConfig.fontHeading } : {}),
                ...(site.themeConfig?.fontBody ? { fontBody: site.themeConfig.fontBody } : {}),
                headerStyle: site.themeConfig?.headerStyle ?? "full-width",
                buttonStyle: site.themeConfig?.buttonStyle ?? "rounded",
              },
              accent: e.target.value,
            })}
            className="h-9 text-xs" />
        </div>
      </div>
    </div>
  );
}

function PublishStep({ site, publicUrl, previewUrl, onUpdateSite }: {
  site: PersonalSiteInput;
  publicUrl: string;
  previewUrl: string;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
}) {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <h2 className="text-sm font-semibold">{t("Terbitkan", "Publish")}</h2>

      {/* Readiness */}
      <div className="flex items-center gap-2">
        <ReadinessBadge site={site} t={(id, fallback) => t(id, fallback)} />
      </div>

      {/* Publish toggle */}
      <button
        type="button"
        onClick={() => onUpdateSite({ published: !site.published })}
        disabled={!site.published && !isReadyToPublish(getPersonalSiteReadiness(site))}
        className={`w-full flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
          site.published
            ? "border-emerald-300 bg-emerald-50 text-emerald-700"
            : isReadyToPublish(getPersonalSiteReadiness(site))
              ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
              : "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed"
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${site.published ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
        {site.published ? t("Tayang — ketuk untuk sembunyikan", "Live — tap to unpublish") : t("Draft — ketuk untuk terbitkan", "Draft — tap to publish")}
      </button>

      {/* Slug */}
      <div className="space-y-2">
        <Label className="text-xs">{t("Slug URL", "URL Slug")}</Label>
        <Input
          value={site.slug}
          onChange={(e) => onUpdateSite({ slug: e.target.value })}
          className="h-9 text-xs"
          placeholder="nama-halaman"
        />
        <p className="text-[10px] text-muted-foreground">{publicUrl}</p>
      </div>

      {/* SEO */}
      <div className="space-y-3">
        <Label className="text-xs font-medium flex items-center gap-1"><Search className="h-3 w-3" /> SEO</Label>
        <SEOPanel site={site} updateSite={onUpdateSite} publicUrl={publicUrl} />
      </div>

      {/* Preview */}
      <Button type="button" variant="outline" size="sm" className="w-full" asChild>
        <a href={previewUrl} target="_blank" rel="noopener noreferrer">
          <Eye className="h-3.5 w-3.5 mr-1" /> {t("Pratinjau", "Preview")}
        </a>
      </Button>
    </div>
  );
}
