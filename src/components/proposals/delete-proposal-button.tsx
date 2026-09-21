"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { deleteProposal } from "@/lib/actions/proposals";

import { useT } from "@/lib/i18n-client";

export function DeleteProposalButton({
  proposalId,
  redirectTo = "/app/proposals",
  label,
  confirmText,
}: {
  proposalId: string;
  redirectTo?: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const displayLabel = label ?? t("Hapus", "Delete");
  const displayConfirmText =
    confirmText ??
    t(
      "Hapus proposal ini? Tidak bisa dibatalkan.",
      "Delete this proposal? This cannot be undone.",
    );

  async function onDelete() {
    setLoading(true);
    try {
      await deleteProposal(proposalId);
      toast.success(t("Proposal dihapus", "Proposal deleted"));
      router.push(redirectTo);
      refresh();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : t("Gagal menghapus", "Failed to delete");
      toast.error(msg);
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2" role="group" aria-label={t("Konfirmasi hapus proposal", "Confirm proposal deletion")}>
        <span className="text-xs text-muted-foreground">{displayConfirmText}</span>
        <LoadingButton type="button" variant="destructive" size="sm" onClick={onDelete} loading={loading} loadingText="...">
          {t("Hapus", "Delete")}
        </LoadingButton>
        <LoadingButton type="button" variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={loading}>
          {t("Batal", "Cancel")}
        </LoadingButton>
      </span>
    );
  }

  return (
    <LoadingButton
      type="button"
      variant="outline"
      size="sm"
      onClick={() => setConfirming(true)}
      loading={loading}
      loadingText="..."
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="h-3.5 w-3.5 mr-1" />
      {displayLabel}
    </LoadingButton>
  );
}
