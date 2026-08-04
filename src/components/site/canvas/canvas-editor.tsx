"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Palette,
  FileText,
  Layers,
  Save,
  Eye,
  Loader2,
  Check,
  Circle,
  PanelLeft,
  Undo2,
  Redo2,
  LayoutTemplate,
  Monitor,
  Tablet,
  Smartphone,
  Briefcase,
  ListOrdered,
  Tag,
  FolderGit2,
  Quote,
  HelpCircle,
  Mail,
  Image as ImageIcon,
  Code,
  Share2,
  MousePointerClick,
  Minus,
  MoveVertical,
  ListCollapse,
  BookOpen,
  Columns3,
} from "lucide-react";
import { DndContext, DragOverlay, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, useDraggable, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanvasRenderer, CANVAS_DEVICES, type CanvasDevice } from "./canvas-renderer";
import { PropertiesPanel } from "./properties-panel";
import { ReadinessBadge } from "../readiness-badge";
import { StructurePanel } from "./structure-panel";
import { MobileStepEditor } from "./mobile-step-editor";
import { useT } from "@/lib/i18n-client";
import { isReadyToPublish, getPersonalSiteReadiness } from "@/lib/personal-site/readiness";
import type { PersonalSiteInput, PersonalSiteSection, PersonalSitePage, ThemeConfig } from "@/lib/personal-site/model";
import { normalizePersonalSiteSlug } from "@/lib/personal-site/model";
import { PAGE_TEMPLATES, getPageTemplatesByCategory, getPageTemplateCategories, type PageTemplate } from "@/lib/personal-site/page-templates";
import { SECTION_TEMPLATES, type SectionTemplate } from "@/lib/personal-site/section-templates";

type Props = {
  initialSite: PersonalSiteInput;
  previewUrl: string;
  publicSiteBaseUrl: string;
  onSave: (site: PersonalSiteInput) => Promise<void>;
};

function makeId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: "#6647F0",
  secondaryColor: "#1e293b",
  backgroundColor: "#ffffff",
  textColor: "#111827",
  headerStyle: "full-width",
  buttonStyle: "rounded",
};

// Device preview (Phase 5) — local state only, never persists or dirties the site document.
const CANVAS_DEVICE_LABELS: Record<CanvasDevice, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
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

function normalizePages(site: PersonalSiteInput): PersonalSitePage[] {
  const pages = site.pages?.length ? site.pages : [{ id: "home", slug: "", title: "Home", isHome: true, sections: site.sections }];
  return pages.map((page, index) => ({ ...page, isHome: page.isHome || index === 0 && !pages.some((p) => p.isHome) }));
}

function pageSections(site: PersonalSiteInput, activePageId: string) {
  const pages = normalizePages(site);
  return pages.find((page) => page.id === activePageId)?.sections ?? site.sections;
}

function syncSiteSections(site: PersonalSiteInput, activePageId: string, sections: PersonalSiteSection[]): PersonalSiteInput {
  const pages = normalizePages(site);
  const nextPages = pages.map((page) => page.id === activePageId ? { ...page, sections } : page);
  return { ...site, sections: nextPages.find((page) => page.isHome)?.sections ?? sections, pages: nextPages };
}

function withThemeConfig(site: PersonalSiteInput, patch: Partial<ThemeConfig>): Partial<PersonalSiteInput> {
  const themeConfig = { ...DEFAULT_THEME_CONFIG, ...(site.themeConfig ?? {}), ...patch };
  return { themeConfig, accent: themeConfig.primaryColor };
}

function emptySection(type: PersonalSiteSection["type"]): PersonalSiteSection {
  const base = { id: makeId(), heading: "Section" };
  switch (type) {
    case "services": return { ...base, type, items: [{ id: makeId(), title: "", description: "" }] };
    case "process": return { ...base, type, steps: [{ id: makeId(), title: "", description: "" }] };
    case "pricing": return { ...base, type, offers: [{ id: makeId(), name: "", price: "", description: "" }] };
    case "portfolio": return { ...base, type, projects: [{ id: makeId(), title: "", description: "", url: "" }] };
    case "testimonials": return { ...base, type, testimonials: [{ id: makeId(), quote: "", author: "", role: "" }] };
    case "faq": return { ...base, type, items: [{ id: makeId(), question: "", answer: "" }] };
    case "contact": return { ...base, type, methods: [{ id: makeId(), label: "", value: "", url: "" }] };
    case "custom": return { ...base, type, content: "" };
    case "gallery": return { ...base, type, images: [{ id: makeId(), url: "", alt: "" }] };
    case "embed": return { ...base, type, url: "", height: 400 };
    case "social": return { ...base, type, links: [{ id: makeId(), platform: "Instagram", url: "" }] };
    case "cta": return { ...base, type, text: "", buttonLabel: "", buttonUrl: "" };
    case "divider": return { ...base, type };
    case "collapsible": return { ...base, type, items: [{ id: makeId(), title: "", content: "" }] };
    case "spacer": return { ...base, type, height: 40 };
    case "tableOfContents": return { ...base, type };
    case "contentBlock": return { ...base, type, columns: 2, layout: "equal", items: [{ id: makeId(), content: "" }, { id: makeId(), content: "" }] };
  }
}

const WIDGET_LIST: Array<{ type: PersonalSiteSection["type"]; label: string; icon: React.ElementType; category: string }> = [
  { type: "custom", label: "Teks", icon: FileText, category: "basic" },
  { type: "services", label: "Layanan", icon: Briefcase, category: "content" },
  { type: "process", label: "Proses", icon: ListOrdered, category: "content" },
  { type: "pricing", label: "Harga", icon: Tag, category: "content" },
  { type: "portfolio", label: "Portofolio", icon: FolderGit2, category: "content" },
  { type: "testimonials", label: "Testimoni", icon: Quote, category: "content" },
  { type: "faq", label: "FAQ", icon: HelpCircle, category: "content" },
  { type: "contact", label: "Kontak", icon: Mail, category: "content" },
  { type: "gallery", label: "Galeri", icon: ImageIcon, category: "media" },
  { type: "embed", label: "Embed", icon: Code, category: "media" },
  { type: "social", label: "Sosial", icon: Share2, category: "basic" },
  { type: "cta", label: "Tombol CTA", icon: MousePointerClick, category: "basic" },
  { type: "divider", label: "Pemisah", icon: Minus, category: "basic" },
  { type: "spacer", label: "Spasi", icon: MoveVertical, category: "basic" },
  { type: "collapsible", label: "Accordion", icon: ListCollapse, category: "content" },
  { type: "tableOfContents", label: "Daftar Isi", icon: BookOpen, category: "navigation" },
  { type: "contentBlock", label: "Multi-Kolom", icon: Columns3, category: "layout" },
];

export function CanvasEditor({ initialSite, previewUrl, publicSiteBaseUrl, onSave }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [site, setSite] = useState<PersonalSiteInput>(() => ({ ...initialSite, pages: normalizePages(initialSite) }));
  const [activePageId, setActivePageId] = useState(() => normalizePages(initialSite).find((page) => page.isHome)?.id ?? normalizePages(initialSite)[0]?.id ?? "home");
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  // Phase 5: preview-only viewport width. Deliberately kept outside `site` so
  // switching devices cannot dirty the document, enter history, or lose edits.
  const [previewDevice, setPreviewDevice] = useState<CanvasDevice>("desktop");
  const [saving, setSaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("insert");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(() => JSON.stringify({ ...initialSite, pages: normalizePages(initialSite) }));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [history, setHistory] = useState<string[]>(() => [JSON.stringify({ ...initialSite, pages: normalizePages(initialSite) })]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Drag state - track currently dragged item for preview
  const [activeDrag, setActiveDrag] = useState<{ id: string; label: string } | null>(null);

  const [showPublishConfirm, setShowPublishConfirm] = useState<boolean | null>(null); // null=hidden, true=publish, false=unpublish

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const data = active.data.current;
    if (data?.type === "template") {
      setActiveDrag({ id: String(active.id), label: data.label as string ?? "" });
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveDrag(null);

    const data = active.data.current;

    // Template drag from sidebar → insert at drop position or append
    if (data?.type === "template" && data.template) {
      const template = data.template as SectionTemplate;
      setSite((prev) => {
        const sections = pageSections(prev, activePageId);
        if (over && typeof over.id === "string" && over.id.startsWith("s_")) {
          const idx = sections.findIndex((s) => s.id === over.id);
          if (idx >= 0) {
            const next = [...sections];
            next.splice(idx, 0, template.build());
            return syncSiteSections(prev, activePageId, next);
          }
        }
        // Append to end if no section target
        return syncSiteSections(prev, activePageId, [...sections, template.build()]);
      });
      return;
    }

    // Section reorder (existing behavior from canvas-renderer)
    if (!over || typeof active.id !== "string" || !active.id.startsWith("s_")) return;
    const sections = pageSections(site, activePageId);
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    const next = [...sections];
    const [moved] = next.splice(oldIndex, 1);
    next.splice(newIndex, 0, moved);
    reorderSections(next);
  }

  const activeSections = useMemo(() => pageSections(site, activePageId), [site, activePageId]);
  const activePage = useMemo(() => normalizePages(site).find((page) => page.id === activePageId) ?? normalizePages(site)[0], [site, activePageId]);
  const selectedSection = useMemo(() => activeSections.find((s) => s.id === selectedSectionId) ?? null, [activeSections, selectedSectionId]);
  const isDirty = useMemo(() => JSON.stringify(site) !== lastSaved, [site, lastSaved]);
  // Phase 7: real public URL (derived from the live slug) for the SEO panel's
  // share preview + copy button — not the draft preview URL.
  const publicUrl = useMemo(() => `${publicSiteBaseUrl}/${normalizePersonalSiteSlug(site.slug)}`, [publicSiteBaseUrl, site.slug]);

  // Deselect when switching pages so the properties panel never points at a section from another page.
  useEffect(() => {
    setSelectedSectionId(null);
  }, [activePageId]);

  // Push to history on site change (debounced)
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (historyTimer.current) clearTimeout(historyTimer.current);
    historyTimer.current = setTimeout(() => {
      const serialized = JSON.stringify(site);
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        if (truncated[truncated.length - 1] === serialized) return prev;
        return [...truncated, serialized].slice(-50); // max 50 states
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
    }, 500);
    return () => { if (historyTimer.current) clearTimeout(historyTimer.current); };
  }, [site, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    const next = JSON.parse(history[newIndex]) as PersonalSiteInput;
    setHistoryIndex(newIndex);
    setSite(next);
    setActivePageId((current) => normalizePages(next).some((page) => page.id === current) ? current : normalizePages(next)[0]?.id ?? "home");
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    const next = JSON.parse(history[newIndex]) as PersonalSiteInput;
    setHistoryIndex(newIndex);
    setSite(next);
    setActivePageId((current) => normalizePages(next).some((page) => page.id === current) ? current : normalizePages(next)[0]?.id ?? "home");
  }, [historyIndex, history]);

  // Auto-save after 2s of inactivity
  useEffect(() => {
    if (!isDirty) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await onSave(site);
        setLastSaved(JSON.stringify(site));
      } catch {
        // silent fail for auto-save
      } finally {
        setSaving(false);
      }
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [site, isDirty, onSave]);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const updateSite = useCallback((patch: Partial<PersonalSiteInput>) => {
    setSite((prev) => ({ ...prev, ...patch }));
  }, []);

  const updateSection = useCallback((sectionId: string, patch: Partial<PersonalSiteSection>) => {
    setSite((prev) => syncSiteSections(prev, activePageId, pageSections(prev, activePageId).map((s) => s.id === sectionId ? { ...s, ...patch } as PersonalSiteSection : s)));
  }, [activePageId]);

  const addSection = useCallback((type: PersonalSiteSection["type"]) => {
    setSite((prev) => syncSiteSections(prev, activePageId, [...pageSections(prev, activePageId), emptySection(type)]));
  }, [activePageId]);

  const addSectionTemplate = useCallback((template: SectionTemplate) => {
    setSite((prev) => syncSiteSections(prev, activePageId, [...pageSections(prev, activePageId), template.build()]));
  }, [activePageId]);

  const moveSection = useCallback((id: string, direction: -1 | 1) => {
    setSite((prev) => {
      const sections = pageSections(prev, activePageId);
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= sections.length) return prev;
      const next = [...sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      return syncSiteSections(prev, activePageId, next);
    });
  }, [activePageId]);

  const duplicateSection = useCallback((id: string) => {
    setSite((prev) => {
      const sections = pageSections(prev, activePageId);
      const idx = sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const original = sections[idx];
      const copy = { ...structuredClone(original), id: makeId(), heading: `${original.heading} (copy)` };
      const next = [...sections];
      next.splice(idx + 1, 0, copy);
      return syncSiteSections(prev, activePageId, next);
    });
  }, [activePageId]);

  const deleteSection = useCallback((id: string) => {
    setSite((prev) => syncSiteSections(prev, activePageId, pageSections(prev, activePageId).filter((s) => s.id !== id)));
    setSelectedSectionId(null);
  }, [activePageId]);

  const reorderSections = useCallback((sections: PersonalSiteSection[]) => {
    setSite((prev) => syncSiteSections(prev, activePageId, sections));
  }, [activePageId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(site);
      setLastSaved(JSON.stringify(site));
      toast.success(t("Tersimpan", "Saved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setSaving(false);
    }
  }, [onSave, router, site, t]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Escape — deselect
      if (e.key === "Escape") {
        setSelectedSectionId(null);
        return;
      }
      // Delete — delete selected section
      if ((e.key === "Delete" || e.key === "Backspace") && selectedSectionId) {
        const target = e.target as HTMLElement;
        if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
        e.preventDefault();
        deleteSection(selectedSectionId);
        return;
      }
      // Ctrl+D / Cmd+D — duplicate selected section
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedSectionId) {
        e.preventDefault();
        duplicateSection(selectedSectionId);
        return;
      }
      // Ctrl+S / Cmd+S — manual save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        return;
      }
      // Ctrl+Z / Cmd+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y — redo
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedSectionId, deleteSection, duplicateSection, handleSave, undo, redo]);

  const groupedWidgets = WIDGET_LIST.reduce<Record<string, typeof WIDGET_LIST>>((acc, w) => {
    (acc[w.category] ??= []).push(w);
    return acc;
  }, {});

  return (
    <>
      {/* Mobile: step-based editor (md breakpoint) */}
      <div className="md:hidden h-[calc(100vh-3.5rem)] overflow-hidden">
        <MobileStepEditor
          site={site}
          activePageId={activePageId}
          selectedSectionId={selectedSectionId}
          publicSiteBaseUrl={publicSiteBaseUrl}
          previewUrl={previewUrl}
          onUpdateSite={updateSite}
          onSetActivePageId={setActivePageId}
          onSelectSection={setSelectedSectionId}
        />
      </div>

      {/* Desktop: DnD canvas + sidebar */}
      <div className="hidden md:block">
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
        {/* Mobile sidebar toggle */}
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="fixed bottom-16 left-3 z-40 md:hidden shadow-lg"
          onClick={() => setMobileSidebar(!mobileSidebar)}
        >
          <PanelLeft className="h-4 w-4" />
        </Button>

        {/* Sidebar overlay (mobile) */}
        {mobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileSidebar(false)}>
            <div className="absolute inset-0 bg-black/50" />
            <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <SidebarContent
                sidebarTab={sidebarTab}
                setSidebarTab={setSidebarTab}
                groupedWidgets={groupedWidgets}
                addSection={(type) => { addSection(type); setMobileSidebar(false); }}
                addSectionTemplate={(template) => { addSectionTemplate(template); setMobileSidebar(false); }}
                site={{ ...site, sections: activeSections }}
                activePageId={activePageId}
                setActivePageId={setActivePageId}
                updateSite={updateSite}
                publicUrl={publicUrl}
                onSelectSection={setSelectedSectionId}
                selectedSectionId={selectedSectionId}
              />
            </aside>
          </div>
        )}

        {/* Left sidebar (desktop) */}
        <aside className="hidden md:block w-64 shrink-0 border-r bg-background overflow-y-auto">
          <SidebarContent
            sidebarTab={sidebarTab}
            setSidebarTab={setSidebarTab}
            groupedWidgets={groupedWidgets}
            addSection={addSection}
            addSectionTemplate={addSectionTemplate}
            site={{ ...site, sections: activeSections }}
            activePageId={activePageId}
            setActivePageId={setActivePageId}
            updateSite={updateSite}
            publicUrl={publicUrl}
            onSelectSection={setSelectedSectionId}
            selectedSectionId={selectedSectionId}
          />
        </aside>

        {/* Canvas area — centers the preview frame, scrolls vertically only; the
            frame never exceeds the area width so no horizontal overflow appears. */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/30 p-6 pb-16">
          <CanvasRenderer
            site={{ ...site, sections: activeSections }}
            device={previewDevice}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onUpdateSite={updateSite}
            onUpdateSection={updateSection}
            onAddSection={addSection}
            onMoveSection={moveSection}
            onDuplicateSection={duplicateSection}
            onDeleteSection={deleteSection}
            onReorderSections={reorderSections}
          />
        </main>

        {/* Properties panel — desktop only, opens when a section is selected */}
        <PropertiesPanel
          section={selectedSection}
          onUpdate={(patch) => { if (selectedSectionId) updateSection(selectedSectionId, patch); }}
          onClose={() => setSelectedSectionId(null)}
        />

        {/* Bottom bar */}
        <div className={`fixed bottom-0 left-0 md:left-64 right-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-2 backdrop-blur ${selectedSection ? "md:right-80" : ""}`} role="status" aria-live="polite">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1 min-w-0">
            <span className="hidden sm:inline">{activePage?.title ?? "Page"} · {activeSections.length} sections</span>
            <span className="hidden sm:inline text-muted-foreground/50">·</span>
            {saving ? (
              <span className="flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" /> {t("Menyimpan...", "Saving...")}</span>
            ) : isDirty ? (
              <span className="flex items-center gap-1 text-amber-600"><Circle className="h-2 w-2 fill-current" /> {t("Belum tersimpan", "Unsaved")}</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> {t("Tersimpan", "Saved")}</span>
            )}
          </div>

          {/* Phase 6: Readiness status badge — clicks toggle accessible issue list */}
          <ReadinessBadge site={site} t={(id, fallback) => t(id, fallback)} />

          {/* Publish toggle */}
          <button
            type="button"
            onClick={() => {
              if (site.published) {
                setShowPublishConfirm(false);
              } else {
                if (!isReadyToPublish(getPersonalSiteReadiness(site))) return;
                setShowPublishConfirm(true);
              }
            }}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
              site.published
                ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : isReadyToPublish(getPersonalSiteReadiness(site))
                  ? "border-muted text-muted-foreground hover:border-primary/40 hover:text-primary"
                  : "border-muted text-muted-foreground/50 cursor-not-allowed"
            }`}
            disabled={!site.published && !isReadyToPublish(getPersonalSiteReadiness(site))}
            title={site.published ? t("Klik untuk unpublish", "Click to unpublish") : t("Belum siap publikasi", "Not ready to publish")}
          >
            <span className={`h-2 w-2 rounded-full ${site.published ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
            {site.published ? t("Live", "Live") : t("Draft", "Draft")}
          </button>

          <div className="flex items-center gap-1">
            {/* Phase 5: device preview switcher — local state only, does not touch site data. */}
            <div
              role="group"
              aria-label={t("Pratinjau perangkat", "Preview device")}
              className="flex items-center rounded-md border bg-muted/40 p-0.5"
            >
              {CANVAS_DEVICES.map((device) => {
                const DeviceIcon = device === "desktop" ? Monitor : device === "tablet" ? Tablet : Smartphone;
                const active = previewDevice === device;
                const label = CANVAS_DEVICE_LABELS[device];
                return (
                  <Button
                    key={device}
                    type="button"
                    variant={active ? "default" : "ghost"}
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPreviewDevice(device)}
                    aria-label={t(`Pratinjau ${label}`, `${label} preview`)}
                    aria-pressed={active}
                    title={t(`Pratinjau ${label}`, `${label} preview`)}
                  >
                    <DeviceIcon className="h-3.5 w-3.5" />
                  </Button>
                );
              })}
            </div>
            <div className="w-px h-5 bg-border mx-1" />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={undo} disabled={historyIndex <= 0} title="Undo (Ctrl+Z)">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={redo} disabled={historyIndex >= history.length - 1} title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="h-4 w-4" />
            </Button>
            <div className="w-px h-5 bg-border mx-1" />
            <Button type="button" variant="outline" size="sm" asChild>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <Eye className="h-4 w-4 mr-1" /> <span className="hidden sm:inline">Preview</span>
              </a>
            </Button>
            <Button type="button" size="sm" onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              {saving ? t("Menyimpan...", "Saving...") : t("Simpan", "Save")}
            </Button>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDrag ? (
          <div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg text-sm font-medium">
            <Layers className="h-4 w-4 text-muted-foreground" />
            {activeDrag.label}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
      </div>

    {/* Publish / Unpublish confirmation dialog */}
    {showPublishConfirm !== null && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-xl border">
          <h3 className="font-semibold mb-2">
            {showPublishConfirm
              ? t("Publikasikan halaman ini?", "Publish this page?")
              : t("Sembunyikan halaman dari publik?", "Unpublish this page?")}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {showPublishConfirm
              ? t("Halaman akan bisa diakses publik melalui URL di atas.", "The page will be publicly accessible at the URL above.")
              : t("Halaman akan disembunyikan dan tidak bisa diakses publik.", "The page will be hidden and not publicly accessible.")}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPublishConfirm(null)} className="flex-1">
              {t("Batal", "Cancel")}
            </Button>
            <Button
              onClick={() => {
                updateSite({ published: showPublishConfirm });
                setShowPublishConfirm(null);
              }}
              className="flex-1"
            >
              {showPublishConfirm ? t("Publikasikan", "Publish") : t("Sembunyikan", "Unpublish")}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

function DraggableTemplateButton({ template, onClick }: { template: SectionTemplate; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `template-${template.id}`,
    data: { type: "template", template, label: template.label },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
  } : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      style={style}
      className="flex flex-col items-center gap-1 rounded-lg border p-2 text-[10px] hover:bg-muted transition-colors text-left cursor-grab active:cursor-grabbing"
      title={template.description}
    >
      <Layers className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="line-clamp-2">{template.label}</span>
    </button>
  );
}

export function SidebarContent({ sidebarTab, setSidebarTab, groupedWidgets, addSection, addSectionTemplate, site, activePageId, setActivePageId, updateSite, publicUrl: _publicUrl, onSelectSection, selectedSectionId }: {
  sidebarTab: string;
  setSidebarTab: (tab: string) => void;
  groupedWidgets: Record<string, Array<{ type: PersonalSiteSection["type"]; label: string; icon: React.ElementType; category: string }>>;
  addSection: (type: PersonalSiteSection["type"]) => void; // Used in mobile editor only
  addSectionTemplate: (template: SectionTemplate) => void; // Used in mobile editor only
  site: PersonalSiteInput;
  activePageId: string;
  setActivePageId: (id: string) => void;
  updateSite: (patch: Partial<PersonalSiteInput>) => void;
  publicUrl: string; // Used in SEOPanel
  onSelectSection?: (id: string | null) => void;
  selectedSectionId?: string | null;
}) {
  const pages = normalizePages(site);

  // Group section templates by category for the Starter Blocks panel
  const groupedSectionTemplates = SECTION_TEMPLATES.reduce<Record<string, SectionTemplate[]>>((acc, template) => {
    (acc[template.category] ??= []).push(template);
    return acc;
  }, {});

  function updatePages(nextPages: PersonalSitePage[]) {
    const normalized = nextPages.map((page, index) => ({ ...page, isHome: page.isHome || index === 0 && !nextPages.some((p) => p.isHome) }));
    updateSite({ pages: normalized, sections: normalized.find((page) => page.isHome)?.sections ?? normalized[0]?.sections ?? [] });
  }

  // These functions are defined for mobile step editor API consistency but NOT called from desktop sidebar
  function _addPage() {
    const id = makeId().replace(/^s_/, "p_");
    const title = `Page ${pages.length + 1}`;
    const page = { id, slug: slugifyPageTitle(title, `page-${pages.length + 1}`), title, isHome: false, sections: [] };
    updatePages([...pages, page]);
    setActivePageId(id);
  }

  function _deletePage(id: string) {
    const nextPages = pages.filter((p) => p.id !== id);
    if (nextPages.length === 0) return;
    if (!nextPages.some((p) => p.isHome)) nextPages[0] = { ...nextPages[0], isHome: true, slug: "" };
    updatePages(nextPages);
    if (activePageId === id) setActivePageId(nextPages[0].id);
  }

  function _renamePage(id: string, title: string) {
    updatePages(pages.map((p) => p.id === id ? { ...p, title, slug: p.isHome ? "" : slugifyPageTitle(title, p.slug || "page") } : p));
  }

  function _setHomePage(id: string) {
    updatePages(pages.map((p) => ({ ...p, isHome: p.id === id, slug: p.id === id ? "" : p.slug || slugifyPageTitle(p.title, "page") })));
  }

  function _movePage(id: string, direction: -1 | 1) {
    const index = pages.findIndex((page) => page.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= pages.length) return;
    const next = [...pages];
    [next[index], next[target]] = [next[target], next[index]];
    updatePages(next);
  }

  function updateTheme(patch: Partial<ThemeConfig>) {
    updateSite(withThemeConfig(site, patch));
  }

  return (
    <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="w-full">
      <TabsList className="w-full h-auto rounded-none grid grid-cols-3">
        <TabsTrigger value="insert" className="text-xs gap-1 px-2 py-2">
          <Plus className="h-3.5 w-3.5" /> Insert
        </TabsTrigger>
        <TabsTrigger value="style" className="text-xs gap-1 px-2 py-2">
          <Palette className="h-3.5 w-3.5" /> Style
        </TabsTrigger>
        <TabsTrigger value="structure" className="text-xs gap-1 px-2 py-2">
          <Layers className="h-3.5 w-3.5" /> Structure
        </TabsTrigger>
      </TabsList>

      <TabsContent value="insert" className="m-0 p-3 space-y-4">
        {/* Starter Blocks - SECTION_TEMPLATES */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Starter Blocks</p>
          {Object.entries(groupedSectionTemplates).map(([category, templates]) => (
            <div key={category}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">{category}</p>
              <div className="grid grid-cols-2 gap-1.5">
                {templates.map((t) => (
                  <DraggableTemplateButton key={t.id} template={t} onClick={() => addSectionTemplate(t)} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Widgets */}
        {Object.entries(groupedWidgets).map(([category, widgets]) => (
          <div key={category}>
            <p className="text-xs font-medium text-muted-foreground uppercase mb-2">{category}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {widgets.map((w) => (
                <button
                  key={w.type}
                  type="button"
                  onClick={() => addSection(w.type)}
                  className="flex flex-col items-center gap-1 rounded-lg border p-2 text-xs hover:bg-muted transition-colors"
                >
                  <w.icon className="h-4 w-4 text-muted-foreground" />
                  {w.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </TabsContent>

      <TabsContent value="style" className="m-0 p-3 space-y-5">
        {/* Templates section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Template Halaman</p>
          <TemplateTabContent site={site} updateSite={updateSite} setActivePageId={setActivePageId} />
        </div>

        <div className="h-px bg-border" />

        {/* Theme section */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Theme Siap Pakai</p>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => updateSite({ theme: preset.theme as PersonalSiteInput["theme"], accent: preset.accent, themeConfig: { ...DEFAULT_THEME_CONFIG, ...(site.themeConfig ?? {}), ...preset.config } })}
                className={`flex items-center gap-2 rounded-lg border p-2 text-xs transition-colors ${site.theme === preset.theme ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
              >
                <div className="flex shrink-0">
                  <div className="h-4 w-4 rounded-l" style={{ backgroundColor: preset.config.primaryColor }} />
                  <div className="h-4 w-4 rounded-r" style={{ backgroundColor: preset.config.backgroundColor, border: "1px solid #e5e7eb" }} />
                </div>
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="h-px bg-border my-4" />

          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Custom Colors</p>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primary Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateTheme({ primaryColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateTheme({ primaryColor: e.target.value })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Text Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateTheme({ textColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateTheme({ textColor: e.target.value })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Background Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateTheme({ backgroundColor: e.target.value })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateTheme({ backgroundColor: e.target.value })} className="h-8 text-xs font-mono" />
            </div>
          </div>

          <div className="h-px bg-border my-4" />

          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">Font</p>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Heading Font</Label>
            <Input value={site.themeConfig?.fontHeading ?? ""} placeholder="Inter, ui-sans-serif" onChange={(e) => updateTheme({ fontHeading: e.target.value || undefined })} className="h-8 text-xs" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Body Font</Label>
            <Input value={site.themeConfig?.fontBody ?? ""} placeholder="Inter, ui-sans-serif" onChange={(e) => updateTheme({ fontBody: e.target.value || undefined })} className="h-8 text-xs" />
          </div>
        </div>
      </TabsContent>

      <TabsContent value="structure" className="m-0 p-0">
        <StructurePanel
          sections={site.sections}
          selectedSectionId={selectedSectionId ?? null}
          onSelectSection={(id) => onSelectSection?.(id)}
        />
      </TabsContent>
    </Tabs>
  );
}

const PRESET_THEMES = [
  {
    name: "Midnight",
    theme: "midnight",
    accent: "#6647F0",
    config: { primaryColor: "#6647F0", secondaryColor: "#1e293b", backgroundColor: "#0f172a", textColor: "#e2e8f0" },
  },
  {
    name: "Paper",
    theme: "paper",
    accent: "#404040",
    config: { primaryColor: "#404040", secondaryColor: "#737373", backgroundColor: "#ffffff", textColor: "#171717" },
  },
  {
    name: "Studio",
    theme: "studio",
    accent: "#6647F0",
    config: { primaryColor: "#6647F0", secondaryColor: "#1e293b", backgroundColor: "#fafafa", textColor: "#111827" },
  },
  {
    name: "Ocean",
    theme: "ocean",
    accent: "#0ea5e9",
    config: { primaryColor: "#0ea5e9", secondaryColor: "#0c4a6e", backgroundColor: "#f0f9ff", textColor: "#0c4a6e" },
  },
  {
    name: "Forest",
    theme: "forest",
    accent: "#16a34a",
    config: { primaryColor: "#16a34a", secondaryColor: "#14532d", backgroundColor: "#f0fdf4", textColor: "#14532d" },
  },
  {
    name: "Sunset",
    theme: "sunset",
    accent: "#ea580c",
    config: { primaryColor: "#ea580c", secondaryColor: "#7c2d12", backgroundColor: "#fff7ed", textColor: "#7c2d12" },
  },
  {
    name: "Rose",
    theme: "rose",
    accent: "#e11d48",
    config: { primaryColor: "#e11d48", secondaryColor: "#881337", backgroundColor: "#fff1f2", textColor: "#881337" },
  },
  {
    name: "Dark",
    theme: "dark",
    accent: "#a78bfa",
    config: { primaryColor: "#a78bfa", secondaryColor: "#312e81", backgroundColor: "#030712", textColor: "#e5e7eb" },
  },
];

// Template tab sub-component
function TemplateTabContent({ site, updateSite, setActivePageId }: { site: PersonalSiteInput; updateSite: (patch: Partial<PersonalSiteInput>) => void; setActivePageId: (id: string) => void }) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [showConfirm, setShowConfirm] = useState<string | null>(null);

  const categories = [{ value: "all", label: "Semua" }, ...getPageTemplateCategories()];
  const templates = getPageTemplatesByCategory(selectedCategory !== "all" ? selectedCategory : undefined);

  function handleApplyTemplate(template: PageTemplate) {
    // Show confirmation if current site has existing content (sections on any page)
    const hasExistingContent = (site.pages?.some((p) => p.sections.length > 0) ?? false) || site.sections.length > 0;
    if (hasExistingContent) {
      setShowConfirm(template.id);
      return;
    }
    applyTemplate(template);
  }

  function applyTemplate(template: PageTemplate) {
    const patch = template.build(site);
    const nextPages = patch.pages ?? [];
    const homePage = nextPages.find((p) => p.isHome) ?? nextPages[0];
    // Top-level sections must mirror the new home page sections; slug/published/links/theme/accent/themeConfig are untouched by the patch merge.
    const nextPatch: Partial<PersonalSiteInput> = {
      ...patch,
      pages: homePage ? nextPages.map((page) => ({ ...page, isHome: page.id === homePage.id })) : nextPages,
      sections: homePage?.sections ?? [],
    };
    updateSite(nextPatch);
    if (homePage) setActivePageId(homePage.id);
    setShowConfirm(null);
  }

  return (
    <div className="space-y-4">
      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setSelectedCategory(cat.value)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              selectedCategory === cat.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted hover:bg-muted"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Template cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <div key={template.id} className="rounded-lg border bg-card p-4 shadow-sm transition-all hover:shadow-md">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-sm">{template.label}</h3>
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="w-full"
              onClick={() => handleApplyTemplate(template)}
            >
              Apply Template
            </Button>
          </div>
        ))}
      </div>

      {/* Confirmation dialog for overwrite warning */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 max-w-sm mx-4 shadow-xl border">
            <h3 className="font-semibold mb-2">Ganti template?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Halaman ini sudah berisi konten. Apakah Anda yakin ingin mengganti dengan template ini? Konten saat ini akan hilang.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowConfirm(null)} className="flex-1">Batal</Button>
              <Button onClick={() => applyTemplate(PAGE_TEMPLATES.find((t) => t.id === showConfirm)!)} className="flex-1">
                Ganti Saja
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}