"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { useT } from "@/lib/i18n-client";

type InvoiceFormProps = Parameters<typeof InvoiceForm>[0];

export function ProjectInvoiceCreateDialog({ project, client, baseCurrency, currencyRates = [], triggerLabel }: {
  project: NonNullable<InvoiceFormProps["projects"]>[number];
  client: { id: string; name: string; companyName: string | null };
  baseCurrency: string;
  currencyRates?: Array<{ fromCurrency: string; rate: string }>;
  triggerLabel?: string;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const handleSuccess = () => { setOpen(false); refresh(); };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" variant="default" className="gap-1"><Plus className="h-4 w-4" /> {triggerLabel ?? t("Buat Invoice", "Create Invoice")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
      <DialogHeader><DialogTitle>{t("Buat Invoice Proyek", "Create Project Invoice")}</DialogTitle></DialogHeader>
      <InvoiceForm mode="create" scopedClientId={client.id} scopedProjectId={project.id} defaultValues={{ clientId: client.id, projectId: project.id, currency: project.currency }} clients={[client]} projects={[project]} baseCurrency={baseCurrency} currencyRates={currencyRates} onSuccess={handleSuccess} />
    </DialogContent>
  </Dialog>;
}
