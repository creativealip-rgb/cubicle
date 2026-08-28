"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Props = {
  clients: Parameters<typeof InvoiceForm>[0]["clients"];
  projects: NonNullable<Parameters<typeof InvoiceForm>[0]["projects"]>;
  baseCurrency: string;
  proposedInvoiceNumber: string;
  currencyRates?: NonNullable<Parameters<typeof InvoiceForm>[0]["currencyRates"]>;
};

export function InvoiceCreateDialog({ clients, projects, baseCurrency, proposedInvoiceNumber, currencyRates = [] }: Props) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> {t("Invoice Baru", "New Invoice")}</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
        <DialogHeader><DialogTitle>{t("Buat Invoice", "Create Invoice")}</DialogTitle></DialogHeader>
        <InvoiceForm mode="create" defaultValues={{ currency: baseCurrency, invoiceNumber: proposedInvoiceNumber }} clients={clients} projects={projects} baseCurrency={baseCurrency} currencyRates={currencyRates} onSuccess={() => { setOpen(false); refresh(); }} />
      </DialogContent>
    </Dialog>
  );
}

export type InvoiceCreateDialogProps = Props;


