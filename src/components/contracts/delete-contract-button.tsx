"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { deleteContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

export function DeleteContractButton({
  contractId,
  redirectTo = "/app/contracts",
  label,
  confirmText,
}: {
  contractId: string;
  redirectTo?: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);

  async function onDelete() {
    try {
      await deleteContract(contractId);
      toast.success(t("Kontrak dihapus", "Contract deleted"));
      router.push(redirectTo);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
      throw err;
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} className="text-destructive hover:text-destructive">
        <Trash2 className="mr-1 h-3.5 w-3.5" />
        {label ?? t("Hapus", "Delete")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("Hapus kontrak?", "Delete contract?")}
        description={confirmText ?? t("Hapus kontrak ini? Tidak bisa dibatalkan.", "Delete this contract? This cannot be undone.")}
        confirmLabel={t("Hapus", "Delete")}
        cancelLabel={t("Batal", "Cancel")}
        onConfirm={onDelete}
        destructive
      />
    </>
  );
}
