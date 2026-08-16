"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  ProposalForm,
  type ClientOption,
  type ServiceOption,
  type ProposalTemplateOption,
} from "@/components/proposals/proposal-form";

export function CreateProposalButton({
  workspaceId,
  defaultCurrency,
  defaultTaxRate,
  clients,
  services = [],
  templates = [],
  defaultOpen = false,
}: {
  workspaceId: string;
  defaultCurrency: string;
  defaultTaxRate: string;
  clients: ClientOption[];
  services?: ServiceOption[];
  templates?: ProposalTemplateOption[];
  defaultOpen?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  function handleCreated(id: string) {
    setOpen(false);
    router.push(`/app/proposals/${id}/edit`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          {t("Proposal baru", "New proposal")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Proposal baru", "New proposal")}</DialogTitle>
          <DialogDescription>
            {t(
              "Kirim scope + harga ke calon klien. Setelah diterima, kerja bisa dimulai.",
              "Send scope + pricing to a prospect. Once accepted, work can begin.",
            )}
          </DialogDescription>
        </DialogHeader>
        <ProposalForm
          workspaceId={workspaceId}
          defaultCurrency={defaultCurrency}
          defaultTaxRate={defaultTaxRate}
          clients={clients}
          services={services}
          templates={templates}
          onCancel={() => setOpen(false)}
          onCreated={handleCreated}
        />
      </DialogContent>
    </Dialog>
  );
}
