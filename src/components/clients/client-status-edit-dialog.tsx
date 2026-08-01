"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateClientStatus } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function ClientStatusEditDialog({ clientId, clientName, currentStatus }: { clientId: string; clientName: string; currentStatus: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive" | "archived">(currentStatus === "inactive" || currentStatus === "archived" ? currentStatus : "active");
  async function save() {
    setLoading(true);
    try { await updateClientStatus(clientId, status); toast.success("Status klien diperbarui"); setOpen(false); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal memperbarui status"); }
    finally { setLoading(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-1"><Pencil className="h-3 w-3" />Edit</Button></DialogTrigger>
    <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Edit status klien</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{clientName}</p>
      <div className="space-y-2"><Label>Status</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Aktif</SelectItem><SelectItem value="inactive">Tidak aktif</SelectItem><SelectItem value="archived">Arsip</SelectItem></SelectContent></Select></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>Batal</Button><Button onClick={save} disabled={loading}>{loading ? "Menyimpan..." : "Simpan"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
