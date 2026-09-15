"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importTaskTemplates, previewTaskTemplateImport } from "@/lib/actions/task-templates";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";

type TemplateOption = {
  id: string;
  name: string;
  target: "fixed_price" | "hourly_retainer" | "all";
};
type PreviewItem = {
  templateId: string;
  itemId: string;
  title: string;
  duplicate: boolean;
  included: boolean;
};

export function TaskTemplateImportDialog({ projects, templates, selectedTemplateId }: { projects: Array<{ id: string; name: string; clientName?: string | null }>; templates: TemplateOption[]; selectedTemplateId?: string | null }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [projectSearch, setProjectSearch] = useState("");
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; duplicateAction?: "skip" | "keep" }>>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [previewFingerprint, setPreviewFingerprint] = useState("");
  const [allowIncompatibleTarget, setAllowIncompatibleTarget] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  useEffect(() => {
    setSelectedTemplateIds(selectedTemplateId ? [selectedTemplateId] : []);
    setPreview([]);
    setSelectedItems([]);
    setPreviewFingerprint("");
  }, [selectedTemplateId]);

  async function loadPreview(templateIds = selectedTemplateIds, destinationProjectId = projectId) {
    if (!destinationProjectId) return;
    setLoading(true);
    try {
      const result = await previewTaskTemplateImport({ projectId: destinationProjectId, templateIds, selectedItems: [], allowIncompatibleTarget });
      setPreview(result.preview);
      setSelectedItems(result.preview.map((item) => ({ itemId: item.itemId })));
      setPreviewFingerprint(result.payloadFingerprint);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preview gagal");
    } finally { setLoading(false); }
  }

  function selectTemplate(id: string) {
    setSelectedTemplateIds((current) => current.includes(id) ? [] : [id]);
    setPreview([]); setSelectedItems([]); setPreviewFingerprint("");
  }

  function toggleItem(itemId: string, checked: boolean) {
    setSelectedItems((current) => checked
      ? current.some((item) => item.itemId === itemId) ? current : [...current, { itemId }]
      : current.filter((item) => item.itemId !== itemId));
  }

  function toggleAllItems(checked: boolean) {
    setSelectedItems(checked ? preview.map((item) => ({ itemId: item.itemId })) : []);
  }

  function setDuplicate(itemId: string, duplicateAction: "skip" | "keep") {
    setSelectedItems((current) => current.map((item) => item.itemId === itemId ? { ...item, duplicateAction } : item));
  }

  async function submit() {
    setLoading(true);
    try {
      const importPayload = { projectId, templateIds: selectedTemplateIds, selectedItems, allowIncompatibleTarget };
      // Item/duplicate decisions change after preview. Refresh fingerprint from exact
      // submit payload so server compares identical canonical data.
      const freshPreview = await previewTaskTemplateImport(importPayload);
      setPreviewFingerprint(freshPreview.payloadFingerprint);
      const result = await importTaskTemplates({
        ...importPayload,
        previewFingerprint: freshPreview.payloadFingerprint,
        idempotencyKey: idempotencyKeyRef.current,
      }) as { created?: unknown[] };
      toast.success(`Tugas berhasil ditambahkan: ${result.created?.length ?? 0}`);
      idempotencyKeyRef.current = crypto.randomUUID();
      setOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import gagal");
    } finally { setLoading(false); }
  }

  const visibleTemplates = selectedTemplateId
    ? templates.filter((template) => template.id === selectedTemplateId)
    : templates;
  const allItemsSelected = preview.length > 0 && preview.every((item) => selectedItems.some((selected) => selected.itemId === item.itemId));
  const filteredProjects = useMemo(() => {
    const term = projectSearch.trim().toLowerCase();
    return term ? projects.filter((project) => project.name.toLowerCase().includes(term) || project.clientName?.toLowerCase().includes(term)) : projects;
  }, [projectSearch, projects]);
  const groupedProjects = useMemo(() => Object.entries(Object.groupBy(filteredProjects, (project) => project.clientName || t("Tanpa Klien", "No client"))).sort(([a], [b]) => a.localeCompare(b)), [filteredProjects, t]);

  function chooseProject(nextProjectId: string) {
    const project = projects.find((candidate) => candidate.id === nextProjectId);
    setProjectId(nextProjectId);
    setProjectSearch(project?.name ?? "");
    setProjectSearchOpen(false);
    setPreview([]); setSelectedItems([]); setPreviewFingerprint("");
    if (selectedTemplateId) void loadPreview([selectedTemplateId], nextProjectId);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (!nextOpen) {
        setProjectId(""); setProjectSearch(""); setProjectSearchOpen(false); setPreview([]); setSelectedItems([]); setPreviewFingerprint("");
      }
    }}>
      <DialogTrigger asChild><Button variant="outline">{t("Import Template", "Import Template")}</Button></DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto p-4 sm:max-w-lg sm:p-6">
        <DialogHeader><DialogTitle>{t("Import Template Tugas", "Import Task Template")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5 text-sm font-medium">
            <span>{t("Pilih project tujuan", "Select destination project")}</span>
            <Popover open={projectSearchOpen} onOpenChange={setProjectSearchOpen}>
              <PopoverAnchor asChild><div className="relative">
                <Input placeholder={t("Cari project tujuan...", "Search destination project...")} value={projectSearch} onChange={(event) => { setProjectSearch(event.target.value); setProjectId(""); setProjectSearchOpen(true); }} onClick={() => setProjectSearchOpen(true)} aria-expanded={projectSearchOpen} aria-haspopup="listbox" className="h-10 pr-9" />
                <button type="button" aria-label={t("Buka daftar project", "Toggle project list")} onClick={() => setProjectSearchOpen((current) => !current)} className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground"><ChevronDown className={`size-4 transition-transform ${projectSearchOpen ? "rotate-180" : ""}`} /></button>
              </div></PopoverAnchor>
              <PopoverContent align="start" sideOffset={5} className="w-[var(--radix-popover-trigger-width)] p-1">
                <div role="listbox" className="max-h-[min(15rem,45dvh)] touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]" onTouchMove={(event) => event.stopPropagation()} onWheel={(event) => event.stopPropagation()}>
                  {filteredProjects.length === 0 ? <p className="p-2 text-xs text-muted-foreground">{t("Project tidak ditemukan", "No project found")}</p> : groupedProjects.map(([clientName, group]) => <div key={clientName} className="py-1 first:pt-0"><p className="sticky top-0 bg-popover px-3 py-1.5 text-xs font-semibold">{clientName}</p>{(group ?? []).map((project) => <button key={project.id} type="button" role="option" aria-selected={projectId === project.id} className={`flex min-h-10 w-full items-center rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${projectId === project.id ? "bg-accent font-medium" : ""}`} onClick={() => chooseProject(project.id)}>{project.name}</button>)}</div>)}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="mx-auto w-full max-w-sm space-y-2">
            {visibleTemplates.map((template) => (
              <button key={template.id} type="button" className={`flex min-h-11 w-full flex-col items-start gap-0.5 rounded-md border px-3 py-2 text-left text-sm ${selectedTemplateIds.includes(template.id) ? "border-primary bg-primary/5" : ""}`} onClick={() => selectTemplate(template.id)}>
                <span className="flex items-center gap-2"><span className={`h-3 w-3 rounded-full border ${selectedTemplateIds.includes(template.id) ? "border-primary bg-primary" : "border-muted-foreground/50"}`} />{template.name}</span>
                <span className="pl-5 text-xs text-muted-foreground">{template.target}</span>
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={allowIncompatibleTarget} onChange={(event) => {setAllowIncompatibleTarget(event.target.checked);setPreview([]);setSelectedItems([]);setPreviewFingerprint("");}} /><span>{t("Izinkan template tidak cocok", "Allow incompatible template")}</span></label>
          {(!selectedTemplateId || preview.length > 0) && <Button variant="outline" onClick={() => void loadPreview()} disabled={loading || !projectId || selectedTemplateIds.length === 0}>{preview.length > 0 ? t("Muat ulang preview", "Refresh preview") : t("Lihat Preview", "View Preview")}</Button>}
          {preview.length ? <div className="overflow-hidden rounded-md border">
            <label className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2 text-sm font-medium">
              <input type="checkbox" checked={allItemsSelected} onChange={(event) => toggleAllItems(event.target.checked)} />
              <span>{t("Pilih semua task", "Select all tasks")}</span>
            </label>
            {preview.map((item) => {
              const decision = selectedItems.find((candidate) => candidate.itemId === item.itemId);
              return <div key={item.itemId} className="flex flex-wrap items-center gap-2 border-b px-3 py-2 last:border-b-0">
                <input type="checkbox" checked={Boolean(decision)} onChange={(event) => toggleItem(item.itemId, event.target.checked)} />
                <span className="min-w-0 flex-1 text-sm">{item.title}</span>
                {item.duplicate ? <div className="flex gap-1"><Button size="sm" variant={decision?.duplicateAction === "skip" ? "default" : "outline"} onClick={() => setDuplicate(item.itemId, "skip")}>Lewati</Button><Button size="sm" variant={decision?.duplicateAction === "keep" ? "default" : "outline"} onClick={() => setDuplicate(item.itemId, "keep")}>Tetap tambahkan</Button></div> : null}
              </div>;
            })}
          </div> : null}
          {projectId && preview.length > 0 && <p className="text-center text-sm font-medium">{t("Import", "Import")} {selectedItems.length} {t("subtask ke", "subtasks into")} {projects.find((project) => project.id === projectId)?.name}</p>}
          <Button className="w-full" onClick={submit} disabled={loading || !projectId || preview.length === 0 || selectedItems.length === 0 || !previewFingerprint}>{t("Import Subtask Terpilih", "Import Selected Subtasks")}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
