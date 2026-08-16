"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { useT } from "@/lib/i18n-client";

type InvoiceFormProps = Parameters<typeof InvoiceForm>[0];

export function ClientInvoiceCreateDialog({ client, projects, baseCurrency, currencyRates = [] }: {
  client: InvoiceFormProps["clients"][number];
  projects: NonNullable<InvoiceFormProps["projects"]>;
  baseCurrency: string;
  currencyRates?: NonNullable<InvoiceFormProps["currencyRates"]>;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> {t("Buat Invoice", "Create Invoice")}</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
      <DialogHeader><DialogTitle>{t("Buat Invoice Klien", "Create Client Invoice")}</DialogTitle></DialogHeader>
      <InvoiceForm mode="create" scopedClientId={client.id} defaultValues={{ clientId: client.id, currency: baseCurrency }} clients={[client]} projects={projects} baseCurrency={baseCurrency} currencyRates={currencyRates} onSuccess={() => { setOpen(false); refresh(); }} />
    </DialogContent>
  </Dialog>;
}
