"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { createContract, getProposedContractNumber } from "@/lib/actions/contracts";
import { toast } from "sonner";

export function DirectCreateContractButton({
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
      const contractNumber = await getProposedContractNumber(workspaceId);
      const res = await createContract({
        workspaceId,
        clientName: "Klien Baru",
        clientEmail: null,
        contractNumber: contractNumber || `CTR-${Date.now()}`,
        title: "Kontrak Kerja Sama",
        body: "## 1. Lingkup Pekerjaan\nDeskripsi lingkup pekerjaan dan deliverables...",
      });
      if ("id" in res) {
        router.push(`/app/contracts/${res.id}/edit`);
        refresh();
      } else {
        toast.error(t("Nomor kontrak sudah digunakan", "Contract number taken"));
        setLoading(false);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat kontrak", "Failed to create contract"));
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
      {t("Kontrak baru", "New contract")}
    </Button>
  );
}
