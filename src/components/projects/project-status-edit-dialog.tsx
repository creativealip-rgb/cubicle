"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { MoreHorizontal, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { updateProjectListStatus } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";

export function ProjectStatusEditDialog({ projectId, projectName, currentStatus }: { projectId: string; projectName: string; currentStatus: string }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const initial = currentStatus === "on_hold" ? "on_hold" : currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "archived" ? "completed" : "active";
  const [status, setStatus] = useState<"active" | "on_hold" | "completed">(initial);
  async function save() {
    setLoading(true);
    try { await updateProjectListStatus(projectId, status); toast.success(t("Status proyek diperbarui", "Project status updated")); setOpen(false); refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal memperbarui status", "Failed to update status")); }
    finally { setLoading(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 rounded-md" aria-label={t("Aksi proyek", "Project actions")}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DialogTrigger asChild><DropdownMenuItem onSelect={(event) => event.preventDefault()}><Pencil className="size-3.5" />{t("Ubah status", "Edit status")}</DropdownMenuItem></DialogTrigger></DropdownMenuContent></DropdownMenu>
    <DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>{t("Edit status proyek", "Edit project status")}</DialogTitle></DialogHeader>
      <p className="text-sm text-muted-foreground">{projectName}</p>
      <div className="space-y-2"><Label>{t("Status", "Status")}</Label><Select value={status} onValueChange={(value) => setStatus(value as typeof status)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">{t("Aktif", "Active")}</SelectItem><SelectItem value="on_hold">{t("Ditunda", "On Hold")}</SelectItem><SelectItem value="completed">{t("Selesai", "Completed")}</SelectItem></SelectContent></Select></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button><LoadingButton onClick={save} loading={loading} loadingText={t("Menyimpan...", "Saving...")}>{t("Simpan", "Save")}</LoadingButton></DialogFooter>
    </DialogContent>
  </Dialog>;
}
