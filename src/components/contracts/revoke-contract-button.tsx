"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { revokeContract } from "@/lib/actions/contracts";

export function RevokeContractButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleRevoke() {
    if (!confirm("Revoke this contract? The link will stop working immediately.")) return;
    startTransition(async () => {
      try {
        await revokeContract(contractId);
        router.refresh();
      } catch (err: any) {
        alert(err?.message || "Revoke failed");
      }
    });
  }

  return (
    <Button variant="outline" onClick={handleRevoke} disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
      Revoke
    </Button>
  );
}
