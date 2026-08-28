"use client";

import { useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revokeContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

export function RevokeContractButton({
  contractId,
  label,
  confirmText,
  pendingLabel,
}: {
  contractId: string;
  label?: string;
  confirmText?: string;
  pendingLabel?: string;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  function handleRevoke() {
    if (!confirm(confirmText ?? t("Cabut kontrak ini? Tautan klien langsung nonaktif.", "Revoke this contract? The client link will be disabled immediately."))) return;
    startTransition(async () => {
      try {
        await revokeContract(contractId);
        toast.success(t("Kontrak dicabut", "Contract revoked"));
        refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("Gagal mencabut", "Failed to revoke");
        toast.error(msg);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRevoke} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5" />
      )}
      {pending ? pendingLabel ?? t("Mencabut...", "Revoking...") : label ?? t("Cabut", "Revoke")}
    </Button>
  );
}
