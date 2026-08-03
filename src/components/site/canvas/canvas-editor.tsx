"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Palette, FileText, Layers, Save, Eye, Loader2, Check, Circle, PanelLeft, Undo2, Redo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CanvasRenderer } from "./canvas-renderer";
import { useT } from "@/lib/i18n-client";
import type { PersonalSiteInput, PersonalSiteSection, PersonalSitePage } from "@/lib/personal-site/model";
import { PERSONAL_SITE_SECTION_TYPES } from "@/lib/personal-site/model";

type Props = {
  initialSite: PersonalSiteInput;
  previewUrl: string;
  onSave: (site: PersonalSiteInput) => Promise<void>;
};

function makeId() {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
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
  { type: "services", label: "Layanan", icon: Layers, category: "content" },
  { type: "process", label: "Proses", icon: Layers, category: "content" },
  { type: "pricing", label: "Harga", icon: Layers, category: "content" },
  { type: "portfolio", label: "Portofolio", icon: Layers, category: "content" },
  { type: "testimonials", label: "Testimoni", icon: Layers, category: "content" },
  { type: "faq", label: "FAQ", icon: Layers, category: "content" },
  { type: "contact", label: "Kontak", icon: Layers, category: "content" },
  { type: "gallery", label: "Galeri", icon: Layers, category: "media" },
  { type: "embed", label: "Embed", icon: Layers, category: "media" },
  { type: "social", label: "Sosial", icon: Layers, category: "basic" },
  { type: "cta", label: "Tombol CTA", icon: Layers, category: "basic" },
  { type: "divider", label: "Pemisah", icon: Layers, category: "basic" },
  { type: "spacer", label: "Spasi", icon: Layers, category: "basic" },
  { type: "collapsible", label: "Accordion", icon: Layers, category: "content" },
  { type: "tableOfContents", label: "Daftar Isi", icon: Layers, category: "navigation" },
  { type: "contentBlock", label: "Multi-Kolom", icon: Layers, category: "layout" },
];

export function CanvasEditor({ initialSite, previewUrl, onSave }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [site, setSite] = useState<PersonalSiteInput>(initialSite);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("insert");
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>(JSON.stringify(initialSite));
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [history, setHistory] = useState<string[]>([JSON.stringify(initialSite)]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const isDirty = useMemo(() => JSON.stringify(site) !== lastSaved, [site, lastSaved]);

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
  }, [site]);

  const undo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setSite(JSON.parse(history[newIndex]));
  }, [historyIndex, history]);

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setSite(JSON.parse(history[newIndex]));
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
  }, [selectedSectionId]);

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
    setSite((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => s.id === sectionId ? { ...s, ...patch } as PersonalSiteSection : s),
    }));
  }, []);

  const addSection = useCallback((type: PersonalSiteSection["type"]) => {
    setSite((prev) => ({
      ...prev,
      sections: [...prev.sections, emptySection(type)],
    }));
  }, []);

  const moveSection = useCallback((id: string, direction: -1 | 1) => {
    setSite((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const target = idx + direction;
      if (target < 0 || target >= prev.sections.length) return prev;
      const next = [...prev.sections];
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...prev, sections: next };
    });
  }, []);

  const duplicateSection = useCallback((id: string) => {
    setSite((prev) => {
      const idx = prev.sections.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const original = prev.sections[idx];
      const copy = { ...structuredClone(original), id: makeId(), heading: `${original.heading} (copy)` };
      const next = [...prev.sections];
      next.splice(idx + 1, 0, copy);
      return { ...prev, sections: next };
    });
  }, []);

  const deleteSection = useCallback((id: string) => {
    setSite((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== id),
    }));
    setSelectedSectionId(null);
  }, []);

  const reorderSections = useCallback((sections: PersonalSiteSection[]) => {
    setSite((prev) => ({ ...prev, sections }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(site);
      toast.success(t("Tersimpan", "Saved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setSaving(false);
    }
  };

  const groupedWidgets = WIDGET_LIST.reduce<Record<string, typeof WIDGET_LIST>>((acc, w) => {
    (acc[w.category] ??= []).push(w);
    return acc;
  }, {});

  return (
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
              site={site}
              updateSite={updateSite}
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
          site={site}
          updateSite={updateSite}
        />
      </aside>

      {/* Canvas area */}
      <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
        <CanvasRenderer
          site={site}
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

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="hidden sm:inline">{site.sections.length} sections</span>
          <span className="hidden sm:inline text-muted-foreground/50">·</span>
          {saving ? (
            <span className="flex items-center gap-1 text-primary"><Loader2 className="h-3 w-3 animate-spin" /> {t("Menyimpan...", "Saving...")}</span>
          ) : isDirty ? (
            <span className="flex items-center gap-1 text-amber-600"><Circle className="h-2 w-2 fill-current" /> {t("Belum tersimpan", "Unsaved")}</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-600"><Check className="h-3 w-3" /> {t("Tersimpan", "Saved")}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
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
  );
}

function SidebarContent({ sidebarTab, setSidebarTab, groupedWidgets, addSection, site, updateSite }: {
  sidebarTab: string;
  setSidebarTab: (tab: string) => void;
  groupedWidgets: Record<string, Array<{ type: PersonalSiteSection["type"]; label: string; icon: React.ElementType; category: string }>>;
  addSection: (type: PersonalSiteSection["type"]) => void;
  site: PersonalSiteInput;
  updateSite: (patch: Partial<PersonalSiteInput>) => void;
}) {
  function addPage() {
    const id = `p_${Math.random().toString(36).slice(2, 8)}`;
    const pages = site.pages ?? [];
    updateSite({ pages: [...pages, { id, slug: `page-${pages.length + 1}`, title: `Page ${pages.length + 1}`, isHome: false, sections: [] }] });
  }

  function deletePage(id: string) {
    const pages = (site.pages ?? []).filter((p) => p.id !== id);
    if (pages.length === 0) return; // can't delete last page
    // If deleted page was home, make first page home
    if (!pages.some((p) => p.isHome)) pages[0].isHome = true;
    updateSite({ pages });
  }

  function renamePage(id: string, title: string) {
    updateSite({ pages: (site.pages ?? []).map((p) => p.id === id ? { ...p, title } : p) });
  }

  return (
    <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="w-full">
      <TabsList className="w-full h-10 rounded-none">
        <TabsTrigger value="insert" className="flex-1 text-xs gap-1">
          <Plus className="h-3 w-3" /> Insert
        </TabsTrigger>
        <TabsTrigger value="pages" className="flex-1 text-xs gap-1">
          <FileText className="h-3 w-3" /> Pages
        </TabsTrigger>
        <TabsTrigger value="theme" className="flex-1 text-xs gap-1">
          <Palette className="h-3 w-3" /> Theme
        </TabsTrigger>
      </TabsList>

      <TabsContent value="insert" className="m-0 p-3 space-y-4">
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

      <TabsContent value="pages" className="m-0 p-3 space-y-2">
        {(site.pages ?? []).map((page) => (
          <div key={page.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm group">
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              value={page.title}
              onChange={(e) => renamePage(page.id, e.target.value)}
              className="flex-1 min-w-0 bg-transparent border-none text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
            />
            {page.isHome && <span className="text-[10px] text-primary font-medium shrink-0">Home</span>}
            {(site.pages ?? []).length > 1 && (
              <button type="button" onClick={() => deletePage(page.id)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-opacity" aria-label="Delete page">
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" className="w-full gap-1" onClick={addPage}>
          <Plus className="h-3 w-3" /> Tambah Page
        </Button>
      </TabsContent>

      <TabsContent value="theme" className="m-0 p-3 space-y-5">
        {/* Preset themes */}
        <div className="space-y-2">
          <Label className="text-xs font-medium">Theme Siap Pakai</Label>
          <div className="grid grid-cols-2 gap-2">
            {PRESET_THEMES.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => updateSite({ theme: preset.theme as PersonalSiteInput["theme"], accent: preset.accent, themeConfig: { ...site.themeConfig!, ...preset.config } })}
                className="flex items-center gap-2 rounded-lg border p-2 text-xs hover:bg-muted transition-colors text-left"
              >
                <div className="flex shrink-0">
                  <div className="h-4 w-4 rounded-l" style={{ backgroundColor: preset.config.primaryColor }} />
                  <div className="h-4 w-4 rounded-r" style={{ backgroundColor: preset.config.backgroundColor, border: "1px solid #e5e7eb" }} />
                </div>
                <span className="truncate">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="h-px bg-border" />

        {/* Custom colors */}
        <div className="space-y-3">
          <Label className="text-xs font-medium">Custom Colors</Label>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primary Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, primaryColor: e.target.value } })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, primaryColor: e.target.value } })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Background Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, backgroundColor: e.target.value } })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, backgroundColor: e.target.value } })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Text Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, textColor: e.target.value } })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, textColor: e.target.value } })} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secondary Color</Label>
            <div className="flex gap-2">
              <input type="color" value={site.themeConfig?.secondaryColor ?? "#1e293b"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, secondaryColor: e.target.value } })} className="h-8 w-8 rounded border cursor-pointer" />
              <Input value={site.themeConfig?.secondaryColor ?? "#1e293b"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, secondaryColor: e.target.value } })} className="h-8 text-xs font-mono" />
            </div>
          </div>
        </div>
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
