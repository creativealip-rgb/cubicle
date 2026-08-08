"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { addInvoiceItem, addProjectInvoiceItem } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

export type ProjectInvoiceItemOption = { id: string; name: string; amount: number; currency: string };

export function InvoiceItemManager({ invoiceId, projectOptions }: { invoiceId: string; projectOptions: ProjectInvoiceItemOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"manual" | "project">("manual");
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState({ description: "", quantity: "1", unitPrice: "0" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (source === "project") {
        if (!projectId) throw new Error("Pilih proyek klien");
        await addProjectInvoiceItem({ invoiceId, projectId });
      } else {
        await addInvoiceItem({ invoiceId, description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) });
      }
      toast.success("Item ditambahkan");
      setOpen(false);
      setSource("manual");
      setProjectId("");
      setForm({ description: "", quantity: "1", unitPrice: "0" });
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> Tambah Item</Button></DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Tambah Rincian Item</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-1">
            <Button type="button" variant={source === "manual" ? "default" : "ghost"} onClick={() => setSource("manual")}>Manual</Button>
            <Button type="button" variant={source === "project" ? "default" : "ghost"} onClick={() => setSource("project")}>Dari Proyek Klien</Button>
          </div>
          {source === "project" ? (
            <div className="space-y-2">
              <Label htmlFor="project-item">Fixed Price Project</Label>
              <select id="project-item" value={projectId} onChange={(event) => setProjectId(event.target.value)} required className="h-11 w-full rounded-md border bg-background px-3 text-sm">
                <option value="">Pilih proyek</option>
                {projectOptions.map((project) => <option key={project.id} value={project.id}>{project.name} · {project.currency} {project.amount.toLocaleString("id-ID")}</option>)}
              </select>
              {projectOptions.length === 0 ? <p className="text-sm text-muted-foreground">Tidak ada Fixed Price Project klien yang masih bisa ditagihkan.</p> : null}
            </div>
          ) : (
            <>
              <div className="space-y-2"><Label htmlFor="description">Deskripsi</Label><Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Desain website" required /></div>
              <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label htmlFor="quantity">Qty</Label><Input id="quantity" type="number" step="0.01" min="0.01" value={form.quantity} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} /></div><div className="space-y-2"><Label htmlFor="unitPrice">Harga Satuan</Label><Input id="unitPrice" type="number" step="0.01" min="0" value={form.unitPrice} onChange={(e) => setForm((p) => ({ ...p, unitPrice: e.target.value }))} /></div></div>
            </>
          )}
          <LoadingButton type="submit" loading={loading} loadingText="Menambahkan..." disabled={source === "project" && !projectId} className="w-full">{"Tambah Item"}</LoadingButton>
        </form>
      </DialogContent>
    </Dialog>
  );
}
