"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { permanentlyDeleteClient } from "@/lib/actions/clients";
import { permanentlyDeleteProject } from "@/lib/actions/projects";
import { permanentlyDeleteTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

type EntityType = "client" | "project" | "task";

export function PermanentDeleteButton({ entityType, entityId, entityName, redirectTo, size = "sm" }: {
  entityType: EntityType;
  entityId: string;
  entityName: string;
  redirectTo?: string;
  size?: "sm" | "default";
}) {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  async function remove() {
    if (confirmation !== entityName) return;
    setLoading(true);
    try {
      if (entityType === "client") await permanentlyDeleteClient(entityId);
      else if (entityType === "project") await permanentlyDeleteProject(entityId);
      else await permanentlyDeleteTask(entityId);
      toast.success(`${entityName} ${t("dihapus permanen", "deleted permanently")}`);
      setOpen(false);
      if (redirectTo) router.push(redirectTo);
      else refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menghapus permanen", "Failed to delete permanently"));
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setConfirmation(""); }}>
    <DialogTrigger asChild>
      <Button type="button" variant="outline" size={size} className="gap-1 text-destructive hover:text-destructive">
        <Trash2 className="h-3.5 w-3.5" /> {t("Hapus Permanen", "Delete Permanently")}
      </Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t("Hapus permanen", "Delete permanently")} {entityName}?</DialogTitle>
        <DialogDescription>
          {t("Data ini dan seluruh data terkait akan dihapus. Tindakan tidak dapat dibatalkan.", "This data and all related data will be deleted. This action cannot be undone.")}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <label htmlFor={`delete-${entityId}`} className="text-sm font-medium">{t("Ketik nama untuk konfirmasi", "Type name to confirm")}</label>
        <Input id={`delete-${entityId}`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={entityName} autoComplete="off" />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
        <LoadingButton type="button" variant="destructive" onClick={remove} loading={loading} loadingText={t("Menghapus...", "Deleting...")} disabled={confirmation !== entityName}>
          {t("Hapus Permanen", "Delete Permanently")}
        </LoadingButton>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
