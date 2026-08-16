"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Trash2 } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { toast } from "sonner";
import { deleteContract } from "@/lib/actions/contracts";

export function DeleteContractButton({
  contractId,
  redirectTo = "/app/contracts",
  label = "Hapus",
  confirmText = "Hapus kontrak ini? Tidak bisa dibatalkan.",
}: {
  contractId: string;
  redirectTo?: string;
  label?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);

  async function onDelete() {
    if (!confirm(confirmText)) return;
    setLoading(true);
    try {
      await deleteContract(contractId);
      toast.success("Kontrak dihapus");
      router.push(redirectTo);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menghapus";
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
      {label}
    </LoadingButton>
  );
}
