"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { createProposal } from "@/lib/actions/proposals";
import { toast } from "sonner";

export function DirectCreateProposalButton({
  workspaceId,
}: {
  workspaceId: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);

  async function handleCreateDirect() {
    if (loading) return;
    setLoading(true);
    try {
      const proposal = await createProposal({
        workspaceId,
        clientName: "Klien Baru",
        title: "Proposal Proyek",
        currency: "IDR",
        taxRate: 0,
        downPaymentPercent: 50,
        lineItems: [
          {
            description: "Layanan Utama",
            quantity: 1,
            unitPrice: 0,
            amount: 0,
          },
        ],
      });
      router.push(`/app/proposals/${proposal.id}/edit`);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat proposal", "Failed to create proposal"));
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      className="gap-1.5 h-8 text-xs font-semibold"
      disabled={loading}
      onClick={handleCreateDirect}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
      {t("Proposal baru", "New proposal")}
    </Button>
  );
}
