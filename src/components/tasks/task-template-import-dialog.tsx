"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
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

export function TaskTemplateImportDialog({ projectId, templates, selectedTemplateId }: { projectId: string; templates: TemplateOption[]; selectedTemplateId?: string | null }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
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

  async function loadPreview(templateIds = selectedTemplateIds) {
    setLoading(true);
    try {
      const result = await previewTaskTemplateImport({ projectId, templateIds, selectedItems: [], allowIncompatibleTarget });
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

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      setOpen(nextOpen);
      if (nextOpen && selectedTemplateId) void loadPreview([selectedTemplateId]);
    }}>
      <DialogTrigger asChild><Button variant="outline">{t("Import Template", "Import Template")}</Button></DialogTrigger>
      <DialogContent className="max-h-[min(90dvh,720px)] w-[calc(100%-1.5rem)] max-w-2xl overflow-y-auto p-4 sm:w-full sm:p-6">
        <DialogHeader><DialogTitle>{t("Import Template Tugas", "Import Task Template")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {visibleTemplates.map((template) => (
              <button key={template.id} type="button" className={`flex min-h-11 w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm ${selectedTemplateIds.includes(template.id) ? "border-primary bg-primary/5" : ""}`} onClick={() => selectTemplate(template.id)}>
                <span className={`h-3 w-3 rounded-full border ${selectedTemplateIds.includes(template.id) ? "border-primary bg-primary" : "border-muted-foreground/50"}`} />
                <span className="flex-1">{template.name}</span><span className="text-xs text-muted-foreground">{template.target}</span>
              </button>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={allowIncompatibleTarget} onChange={(event) => {setAllowIncompatibleTarget(event.target.checked);setPreview([]);setSelectedItems([]);setPreviewFingerprint("");}} /><span>{t("Izinkan template tidak cocok", "Allow incompatible template")}</span></label>
          <Button onClick={() => void loadPreview()} disabled={loading || selectedTemplateIds.length === 0}>{t("Lihat Preview", "View Preview")}</Button>
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
          <Button className="w-full" onClick={submit} disabled={loading || preview.length === 0 || selectedItems.length === 0 || !previewFingerprint}>Import Tugas Terpilih</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
