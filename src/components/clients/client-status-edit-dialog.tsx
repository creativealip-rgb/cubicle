"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateClientStatus } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";

export function ClientStatusEditDialog({ clientId, clientName, currentStatus }: { clientId: string; clientName: string; currentStatus: string }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"active" | "inactive" | "archived">(currentStatus === "inactive" || currentStatus === "archived" ? currentStatus : "active");
  async function save() {
    setLoading(true);
    try { await updateClientStatus(clientId, status); toast.success(t("Status klien diperbarui", "Client status updated")); setOpen(false); refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal memperbarui status", "Failed to update status")); }
    finally { setLoading(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm" className="h-8 gap-1"><Pencil className="h-3 w-3" />{t("Ubah", "Edit")}</Button></DialogTrigger>
    <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{t("Edit status klien", "Edit client status")}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{clientName}</p>
      <div className="space-y-2"><Label>{t("Status", "Status")}</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t("Aktif", "Active")}</SelectItem><SelectItem value="inactive">{t("Tidak aktif", "Inactive")}</SelectItem><SelectItem value="archived">{t("Arsip", "Archived")}</SelectItem></SelectContent></Select></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button><LoadingButton onClick={save} loading={loading} loadingText={t("Menyimpan...", "Saving...")}>{t("Simpan", "Save")}</LoadingButton></DialogFooter>
    </DialogContent>
  </Dialog>;
}
