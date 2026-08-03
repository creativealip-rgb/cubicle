"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Palette, FileText, Layers, Save, Eye, Loader2 } from "lucide-react";
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
      {/* Left sidebar */}
      <aside className="w-64 shrink-0 border-r bg-background overflow-y-auto">
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
            {site.pages?.map((page) => (
              <div key={page.id} className="flex items-center gap-2 rounded-lg border p-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 truncate">{page.title}</span>
                {page.isHome && <span className="text-xs text-primary">Home</span>}
              </div>
            )) ?? (
              <p className="text-xs text-muted-foreground">Single page mode</p>
            )}
            <Button type="button" variant="outline" size="sm" className="w-full gap-1" disabled>
              <Plus className="h-3 w-3" /> Tambah Page (soon)
            </Button>
          </TabsContent>

          <TabsContent value="theme" className="m-0 p-3 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Primary Color</Label>
              <div className="flex gap-2">
                <input type="color" value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, primaryColor: e.target.value } })} className="h-8 w-8 rounded border" />
                <Input value={site.themeConfig?.primaryColor ?? "#6647F0"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, primaryColor: e.target.value } })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Background Color</Label>
              <div className="flex gap-2">
                <input type="color" value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, backgroundColor: e.target.value } })} className="h-8 w-8 rounded border" />
                <Input value={site.themeConfig?.backgroundColor ?? "#ffffff"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, backgroundColor: e.target.value } })} className="h-8 text-xs" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Text Color</Label>
              <div className="flex gap-2">
                <input type="color" value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, textColor: e.target.value } })} className="h-8 w-8 rounded border" />
                <Input value={site.themeConfig?.textColor ?? "#111827"} onChange={(e) => updateSite({ themeConfig: { ...site.themeConfig!, textColor: e.target.value } })} className="h-8 text-xs" />
              </div>
            </div>
          </TabsContent>
        </Tabs>
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
        />
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-64 right-0 z-30 flex items-center justify-between gap-3 border-t bg-background/95 px-4 py-2 backdrop-blur">
        <div className="text-xs text-muted-foreground">
          {site.sections.length} sections
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={previewUrl} target="_blank" rel="noopener noreferrer">
              <Eye className="h-4 w-4 mr-1" /> Preview
            </a>
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            {saving ? t("Menyimpan...", "Saving...") : t("Simpan", "Save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
