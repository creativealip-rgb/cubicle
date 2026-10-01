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
  redirectTo,
  label,
  confirmText,
  variant = "outline",
  size = "sm",
  className,
}: {
  contractId: string;
  redirectTo?: string;
  label?: string;
  confirmText?: string;
  variant?: "outline" | "ghost" | "destructive";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);

  async function onDelete() {
    try {
      await deleteContract(contractId);
      toast.success(t("Kontrak dihapus", "Contract deleted"));
      if (redirectTo) {
        router.push(redirectTo);
      }
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
      throw err;
    }
  }

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className ?? "text-destructive hover:bg-destructive/10 hover:text-destructive"}
      >
        <Trash2 className="h-3.5 w-3.5" />
        {size !== "icon" && <span className="ml-1">{label ?? t("Hapus", "Delete")}</span>}
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
