"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
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
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(confirmText ?? t("Hapus kontrak ini? Tidak bisa dibatalkan.", "Delete this contract? This cannot be undone."))) return;
    setLoading(true);
    try {
      await deleteContract(contractId);
      toast.success(t("Kontrak dihapus", "Contract deleted"));
      router.push(redirectTo);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete");
      toast.error(msg);
      setLoading(false);
    }
  }

  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      onClick={onDelete}
      loading={loading}
      loadingText="..."
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5 mr-1" />
      {label ?? t("Hapus", "Delete")}
    </LoadingButton>
  );
}
