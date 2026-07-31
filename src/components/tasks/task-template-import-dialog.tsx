"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { importTaskTemplates, previewTaskTemplateImport } from "@/lib/actions/task-templates";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

export function TaskTemplateImportDialog({ projectId, templates }: { projectId: string; templates: TemplateOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<Array<{ itemId: string; duplicateAction?: "skip" | "keep" }>>([]);
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [allowIncompatibleTarget, setAllowIncompatibleTarget] = useState(false);
  const idempotencyKeyRef = useRef<string>(crypto.randomUUID());

  async function loadPreview() {
    setLoading(true);
    try {
      const result = await previewTaskTemplateImport({ projectId, templateIds: selectedTemplateIds, selectedItems, allowIncompatibleTarget });
      setPreview(result.preview);
      setSelectedItems(result.preview.map((item) => ({ itemId: item.itemId, duplicateAction: item.duplicate ? "skip" : "keep" })));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Preview gagal");
    } finally { setLoading(false); }
  }

  function toggleTemplate(id: string) {
    setSelectedTemplateIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
    setPreview([]);
  }

  function toggleItem(itemId: string, checked: boolean) {
    setSelectedItems((current) => checked
      ? current.some((item) => item.itemId === itemId) ? current : [...current, { itemId }]
      : current.filter((item) => item.itemId !== itemId));
  }

  function setDuplicate(itemId: string, duplicateAction: "skip" | "keep") {
    setSelectedItems((current) => current.map((item) => item.itemId === itemId ? { ...item, duplicateAction } : item));
  }

  async function submit() {
    setLoading(true);
    try {
      const result = await importTaskTemplates({
        projectId, templateIds: selectedTemplateIds, selectedItems, allowIncompatibleTarget,
        idempotencyKey: idempotencyKeyRef.current,
      }) as { created?: unknown[] };
      toast.success(`Tugas berhasil ditambahkan: ${result.created?.length ?? 0}`);
      idempotencyKeyRef.current = crypto.randomUUID();
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import gagal");
    } finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline">Import Template</Button></DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader><DialogTitle>Import Template Tugas</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {templates.map((template) => (
              <label key={template.id} className="flex min-h-11 items-center gap-3 rounded-md border px-3 py-2 text-sm">
                <input type="checkbox" checked={selectedTemplateIds.includes(template.id)} onChange={() => toggleTemplate(template.id)} />
                <span className="flex-1">{template.name}</span><span className="text-xs text-muted-foreground">{template.target}</span>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={allowIncompatibleTarget} onChange={(event) => setAllowIncompatibleTarget(event.target.checked)} /><span>Tampilkan dan adaptasikan template yang target billing-nya berbeda.</span></label>
          <Button onClick={loadPreview} disabled={loading || selectedTemplateIds.length === 0}>Lihat Preview</Button>
          {preview.length ? <div className="overflow-hidden rounded-md border">
            {preview.map((item) => {
              const decision = selectedItems.find((candidate) => candidate.itemId === item.itemId);
              return <div key={item.itemId} className="flex flex-wrap items-center gap-2 border-b px-3 py-2 last:border-b-0">
                <input type="checkbox" checked={Boolean(decision)} onChange={(event) => toggleItem(item.itemId, event.target.checked)} />
                <span className="min-w-0 flex-1 text-sm">{item.title}</span>
                {item.duplicate ? <div className="flex gap-1"><Button size="sm" variant={decision?.duplicateAction === "skip" ? "default" : "outline"} onClick={() => setDuplicate(item.itemId, "skip")}>Lewati</Button><Button size="sm" variant={decision?.duplicateAction === "keep" ? "default" : "outline"} onClick={() => setDuplicate(item.itemId, "keep")}>Tetap tambahkan</Button></div> : null}
              </div>;
            })}
          </div> : null}
          <Button className="w-full" onClick={submit} disabled={loading || preview.length === 0}>Import Tugas Terpilih</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
