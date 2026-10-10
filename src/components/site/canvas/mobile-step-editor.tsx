"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Layers, Palette, Eye, Trash2, Copy, Home, Search, Globe, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { PersonalSiteInput, PersonalSiteSection, PersonalSitePage } from "@/lib/personal-site/model";
import { normalizePersonalSiteSlug } from "@/lib/personal-site/model";
import { SECTION_TEMPLATES, type SectionTemplate } from "@/lib/personal-site/section-templates";
import {
  MAX_PAGES,
  MAX_SECTIONS,
  addPage as addPageToList,
  addSection as addSectionToList,
  duplicateSection as duplicateSectionToList,
  isSectionEmpty,
  moveSectionByOffset,
  removePage as removePageFromList,
  removeSection,
} from "@/lib/personal-site/editor-mutations";
import { CanvasRenderer } from "./canvas-renderer";
import { SEOPanel } from "./seo-panel";
import { MobilePropertiesDrawer } from "./mobile-properties-drawer";
import { ReadinessBadge } from "../readiness-badge";
import { isReadyToPublish, getPersonalSiteReadiness } from "@/lib/personal-site/readiness";
import { useT } from "@/lib/i18n-client";

/** Space-constrained controls live in drawers over the canvas, matching the Forms builder. */
type DrawerId = "elements" | "structure" | "theme" | "publish";

const DRAWERS: Array<{ id: DrawerId; label: { id: string; en: string }; icon: typeof Plus }> = [
  { id: "elements", label: { id: "Elemen", en: "Elements" }, icon: Plus },
  { id: "structure", label: { id: "Struktur", en: "Structure" }, icon: Layers },
  { id: "theme", label: { id: "Tema", en: "Theme" }, icon: Palette },
  { id: "publish", label: { id: "Terbitkan", en: "Publish" }, icon: Eye },
];

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
  { name: "Midnight", theme: "midnight" as const, accent: "#2563EB", primary: "#2563EB", bg: "#0f172a", text: "#e2e8f0" },
  { name: "Paper", theme: "paper" as const, accent: "#404040", primary: "#404040", bg: "#ffffff", text: "#171717" },
  { name: "Studio", theme: "studio" as const, accent: "#2563EB", primary: "#2563EB", bg: "#fafafa", text: "#111827" },
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
  canEditSlug: boolean;
};

/**
 * Canvas-first mobile Landing editor. The rendered site is the primary surface;
 * every management capability from the old step wizard (pages, section
 * add/reorder/duplicate/delete/templates, theme, publish) moved into a bottom
 * drawer over the canvas. Properties opens on section selection (Task 6 drawer).
 */
export function MobileStepEditor({
  site,
  activePageId,
  selectedSectionId,
  publicSiteBaseUrl,
  previewUrl,
  onUpdateSite,
  onSetActivePageId,
  onSelectSection,
  canEditSlug,
}: Props) {
  const { t } = useT();
  const [drawer, setDrawer] = useState<DrawerId | null>(null);
  const [pendingSectionDeleteId, setPendingSectionDeleteId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const publicUrl = `${publicSiteBaseUrl}/${normalizePersonalSiteSlug(site.slug)}`;

  const pages = site.pages?.length ? site.pages : [{ id: "home", slug: "", title: "Home", isHome: true, sections: site.sections }];
  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];
  const sections = activePage.sections;
  const selectedSection = sections.find((s) => s.id === selectedSectionId) ?? null;

  function updatePages(nextPages: PersonalSitePage[]) {
    const normalized = nextPages.map((p, i) => ({ ...p, isHome: p.isHome || (i === 0 && !nextPages.some((pp) => pp.isHome)) }));
    onUpdateSite({ pages: normalized, sections: normalized.find((p) => p.isHome)?.sections ?? normalized[0]?.sections ?? [] });
  }

  /** Patch a single section in the active page (mobile parity with desktop rail). */
  function updateSection(id: string, patch: Partial<PersonalSiteSection>) {
    const nextSections = sections.map((s) => (s.id === id ? ({ ...s, ...patch } as PersonalSiteSection) : s));
    const nextPages = pages.map((p) => (p.id === activePageId ? { ...p, sections: nextSections } : p));
    updatePages(nextPages);
  }

  function notifySectionLimit() {
    toast.error(t("Batas maksimal 12 bagian tercapai.", "Maximum of 12 sections reached."));
  }

  function addSection(templateOrType: SectionTemplate | string) {
    if (sections.length >= MAX_SECTIONS) {
      notifySectionLimit();
      return;
    }
    const newSection = typeof templateOrType === "string"
      ? { id: makeId(), type: templateOrType as PersonalSiteSection["type"], heading: "Section" } as PersonalSiteSection
      : templateOrType.build();
    const nextSections = addSectionToList(sections, newSection);
    if (nextSections === sections) return;
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: nextSections } : p);
    updatePages(nextPages);
  }

  /** Desktop parity: copy a section directly below the original. */
  function duplicateSection(id: string) {
    if (sections.length >= MAX_SECTIONS) {
      notifySectionLimit();
      return;
    }
    const nextSections = duplicateSectionToList(sections, id, makeId);
    if (nextSections === sections) return;
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: nextSections } : p);
    updatePages(nextPages);
  }

  function removeSectionNow(id: string) {
    const nextSections = removeSection(sections, id);
    if (nextSections === sections) return;
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: nextSections } : p);
    updatePages(nextPages);
    if (selectedSectionId === id) onSelectSection(null);
  }

  /** Same gate as desktop: empty sections delete directly, others confirm. */
  function requestDeleteSection(id: string) {
    const target = sections.find((section) => section.id === id);
    if (!target) return;
    if (isSectionEmpty(target)) {
      removeSectionNow(id);
      return;
    }
    setPendingSectionDeleteId(id);
  }

  function reorderSections(from: number, to: number) {
    const moved = sections[from];
    const next = moved ? moveSectionByOffset(sections, moved.id, to - from) : sections;
    if (next === sections) return;
    const nextPages = pages.map((p) => p.id === activePageId ? { ...p, sections: next } : p);
    updatePages(nextPages);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from < 0 || to < 0) return;
    reorderSections(from, to);
  }

  return (
    <div className="flex flex-col h-full" data-testid="mobile-landing-editor">
      {/* Compact header — canvas-first, no wizard steps */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-background shrink-0">
        <Globe className="h-4 w-4 text-primary shrink-0" />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {site.title || t("Landing Page", "Landing Page")}
        </span>
        <Badge variant="outline" className={`shrink-0 text-[10px] font-bold uppercase tracking-wider ${
          site.published ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-muted text-muted-foreground"
        }`}>
          {site.published ? t("Live", "Live") : t("Draft", "Draft")}
        </Badge>
      </div>

      {/*
        Contained toolbar: horizontally scrollable so it never overflows a 390px
        viewport (jsdom can't measure pixels, so containment is asserted via
        `overflow-x-auto` on this container in the tests).
      */}
      <div
        data-testid="mobile-landing-toolbar"
        role="toolbar"
        aria-label={t("Alat editor", "Editor tools")}
        className="flex items-center gap-1 overflow-x-auto px-2 py-1.5 border-b bg-muted/30 shrink-0"
      >
        {DRAWERS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            id={`mobile-drawer-trigger-${id}`}
            aria-expanded={drawer === id}
            aria-haspopup="dialog"
            onClick={() => setDrawer(drawer === id ? null : id)}
            className={`shrink-0 flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
              drawer === id ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-3 w-3" />
            {t(label.id, label.en)}
          </button>
        ))}
      </div>

      {/* Primary surface: the rendered site, always visible */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div
          data-testid="mobile-landing-canvas"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-muted/30 p-2"
        >
          <CanvasRenderer
            site={{ ...site, sections }}
            device="mobile"
            selectedSectionId={selectedSectionId}
            onSelectSection={onSelectSection}
            onUpdateSite={onUpdateSite}
            onUpdateSection={updateSection}
            onAddSection={(type) => addSection(type)}
            onMoveSection={(id, direction) => {
              const i = sections.findIndex((s) => s.id === id);
              if (i < 0) return;
              reorderSections(i, i + direction);
            }}
            onDuplicateSection={duplicateSection}
            onDeleteSection={requestDeleteSection}
          />
        </div>
      </DndContext>

      {/* Elements: pages + section templates */}
      <MobileDrawer id="elements" open={drawer === "elements"} onOpenChange={(open) => setDrawer(open ? "elements" : null)} title={t("Elemen", "Elements")}>
        <PagesStep
          pages={pages}
          activePageId={activePageId}
          onSetActivePageId={onSetActivePageId}
          updatePages={updatePages}
        />
        <div className="mt-5">
          <SectionTemplatePicker addSection={addSection} />
        </div>
      </MobileDrawer>

      {/* Structure: section order + per-row actions */}
      <MobileDrawer id="structure" open={drawer === "structure"} onOpenChange={(open) => setDrawer(open ? "structure" : null)} title={t("Struktur", "Structure")}>
        <SectionList
          sections={sections}
          selectedSectionId={selectedSectionId}
          onSelectSection={(id) => {
            onSelectSection(id);
            setDrawer(null);
          }}
          duplicateSection={duplicateSection}
          deleteSection={requestDeleteSection}
          reorderSections={reorderSections}
        />
      </MobileDrawer>

      <MobileDrawer id="theme" open={drawer === "theme"} onOpenChange={(open) => setDrawer(open ? "theme" : null)} title={t("Tema", "Theme")}>
        <ThemeStep site={site} onUpdateSite={onUpdateSite} />
      </MobileDrawer>

      <MobileDrawer id="publish" open={drawer === "publish"} onOpenChange={(open) => setDrawer(open ? "publish" : null)} title={t("Terbitkan", "Publish")}>
        <PublishStep
          site={site}
          publicUrl={publicUrl}
          previewUrl={previewUrl}
          onUpdateSite={onUpdateSite}
          canEditSlug={canEditSlug}
        />
      </MobileDrawer>

      <MobilePropertiesDrawer
        section={selectedSection}
        focusReturnId="mobile-drawer-trigger-structure"
        onUpdate={(patch) => { if (selectedSection) updateSection(selectedSection.id, patch); }}
        onDelete={() => { if (selectedSection) requestDeleteSection(selectedSection.id); }}
        onClose={() => onSelectSection(null)}
      />

      <ConfirmDialog
        open={pendingSectionDeleteId !== null}
        onOpenChange={(open) => { if (!open) setPendingSectionDeleteId(null); }}
        title={t("Hapus bagian ini?", "Delete this section?")}
        description={t("Bagian beserta seluruh isinya akan dihapus.", "The section and all its content will be removed.")}
        confirmLabel={t("Hapus Bagian", "Delete Section")}
        destructive
        onConfirm={() => {
          if (pendingSectionDeleteId) removeSectionNow(pendingSectionDeleteId);
          setPendingSectionDeleteId(null);
        }}
      />
    </div>
  );
}

/** Bottom drawer shell for one management panel; returns focus to its toolbar trigger on close. */
function MobileDrawer({ id, open, onOpenChange, title, children }: {
  id: DrawerId;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  const { t } = useT();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        data-testid={`mobile-drawer-${id}`}
        className="flex max-h-[85vh] flex-col gap-0 rounded-t-2xl p-0 md:hidden [&>button]:hidden"
        onCloseAutoFocus={(event) => {
          const trigger = document.getElementById(`mobile-drawer-trigger-${id}`);
          if (!trigger) return;
          event.preventDefault();
          trigger.focus();
        }}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3">
          <SheetTitle className="text-sm font-semibold">{title}</SheetTitle>
          <button
            type="button"
            aria-label={t("Tutup panel", "Close panel")}
            onClick={() => onOpenChange(false)}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </SheetContent>
    </Sheet>
  );
}

function PagesStep({ pages, activePageId, onSetActivePageId, updatePages }: {
  pages: PersonalSitePage[];
  activePageId: string;
  onSetActivePageId: (id: string) => void;
  updatePages: (pages: PersonalSitePage[]) => void;
}) {
  function addPage() {
    if (pages.length >= MAX_PAGES) {
      toast.error(t(`Batas maksimal ${MAX_PAGES} halaman tercapai.`, `Maximum of ${MAX_PAGES} pages reached.`));
      return;
    }
    const id = makeId().replace(/^s_/, "p_");
    const title = `${t("Halaman", "Page")} ${pages.length + 1}`;
    const nextPages = addPageToList(pages, { id, slug: slugifyPageTitle(title, `page-${pages.length + 1}`), title, isHome: false, sections: [] });
    if (nextPages === pages) return;
    updatePages(nextPages);
    onSetActivePageId(id);
  }

  const { t } = useT();
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold">{t("Halaman", "Pages")}</h2>
      {pages.map((page) => (
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
                  const next = removePageFromList(pages, page.id);
                  if (next === pages) return;
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
        <Plus className="h-3.5 w-3.5" /> {t("Tambah Halaman", "Add Page")}
      </Button>
    </div>
  );
}

const SECTION_TEMPLATE_EN: Record<string, string> = { "Layanan 3 Kartu": "3 Service Cards", "Pengembangan Software": "Software Development", "Proses 3 Langkah": "3-Step Process", "Metode Agile": "Agile Method", "Pricing 3 Paket": "3-Tier Pricing", "SaaS Pricing Tier": "SaaS Pricing Tiers", "FAQ 5 Pertanyaan": "5-Question FAQ", "FAQ Freelancer": "Freelancer FAQ", "CTA Utama": "Primary CTA", "CTA Kontak": "Contact CTA", "Testimoni 3 Klien": "3-Client Testimonials", "Portfolio Gallery": "Portfolio Gallery", "Embed Video": "Video Embed" };

function SectionTemplatePicker({ addSection }: { addSection: (t: SectionTemplate | string) => void }) {
  const { t } = useT();
  return (
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
  );
}

function SectionList({ sections, selectedSectionId, onSelectSection, duplicateSection, deleteSection, reorderSections }: {
  sections: PersonalSiteSection[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  duplicateSection: (id: string) => void;
  deleteSection: (id: string) => void;
  reorderSections: (from: number, to: number) => void;
}) {
  const { t } = useT();
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold">{t("Bagian", "Sections")} ({sections.length})</h2>
      <div className="space-y-1">
        {sections.map((section, i) => (
          <div key={section.id} className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${selectedSectionId === section.id ? "border-primary/60 bg-primary/5" : ""}`}>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={t("Naikkan bagian", "Move section up")} disabled={i === 0} onClick={() => reorderSections(i, i - 1)}>↑</Button>
              <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={t("Turunkan bagian", "Move section down")} disabled={i === sections.length - 1} onClick={() => reorderSections(i, i + 1)}>↓</Button>
            </div>
            {/* Task 6 drawer returns focus here when it can; the toolbar trigger is the mobile fallback. */}
            <button type="button" id={`section-row-${section.id}`} className="flex-1 text-left truncate" onClick={() => onSelectSection(section.id)}>
              {section.heading || section.type}
            </button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label={t("Duplikat bagian", "Duplicate section")} onClick={() => duplicateSection(section.id)}>
              <Copy className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label={t("Hapus bagian", "Delete section")} onClick={() => deleteSection(section.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {sections.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">{t("Belum ada bagian. Tambahkan dari Elemen.", "No sections yet. Add one from Elements.")}</p>
        )}
      </div>
    </div>
  );
}

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
          <input type="color" value={site.themeConfig?.primaryColor ?? "#2563EB"}
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
          <Input value={site.themeConfig?.primaryColor ?? "#2563EB"}
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

function PublishStep({ site, publicUrl, previewUrl, onUpdateSite, canEditSlug }: {
  site: PersonalSiteInput;
  publicUrl: string;
  previewUrl: string;
  onUpdateSite: (patch: Partial<PersonalSiteInput>) => void;
  canEditSlug: boolean;
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
          disabled={!canEditSlug}
          readOnly={!canEditSlug}
          className="h-9 text-xs"
          placeholder="your-url"
        />
        {!canEditSlug && (
          <p className="text-xs text-muted-foreground">
            {t("Paket Free menggunakan slug workspace. Upgrade untuk memakai slug kustom.", "Free uses your workspace slug. Upgrade to use a custom slug.")} {" "}
            <Link href="/app/billing" className="font-medium underline">Upgrade</Link>
          </p>
        )}
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
          <Eye className="h-3.5 w-3.5" /> {t("Pratinjau", "Preview")}
        </a>
      </Button>
    </div>
  );
}
