"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { revokeContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

export function RevokeContractButton({
  contractId,
  label = "Cabut",
  confirmText = "Cabut kontrak ini? Tautan klien langsung nonaktif.",
  pendingLabel = "Mencabut...",
}: {
  contractId: string;
  label?: string;
  confirmText?: string;
  pendingLabel?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const [pending, startTransition] = useTransition();

  function handleRevoke() {
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      try {
        await revokeContract(contractId);
        toast.success(t("Kontrak dicabut", "Contract revoked"));
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : t("Gagal mencabut", "Revoke failed");
        toast.error(msg);
      }
    });
  }

  return (
    <Button variant="outline" size="sm" onClick={handleRevoke} disabled={pending}>
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
      ) : (
        <X className="h-3.5 w-3.5 mr-1" />
      )}
      {pending ? pendingLabel : label}
    </Button>
  );
}
