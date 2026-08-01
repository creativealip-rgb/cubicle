"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/forms/invoice-form";

type InvoiceFormProps = Parameters<typeof InvoiceForm>[0];

export function ClientInvoiceCreateDialog({ client, projects, baseCurrency, currencyRates = [] }: {
  client: InvoiceFormProps["clients"][number];
  projects: NonNullable<InvoiceFormProps["projects"]>;
  baseCurrency: string;
  currencyRates?: NonNullable<InvoiceFormProps["currencyRates"]>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Buat Invoice</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
      <DialogHeader><DialogTitle>Buat Invoice Klien</DialogTitle></DialogHeader>
      <InvoiceForm mode="create" scopedClientId={client.id} defaultValues={{ clientId: client.id, currency: baseCurrency }} clients={[client]} projects={projects} baseCurrency={baseCurrency} currencyRates={currencyRates} onSuccess={() => { setOpen(false); router.refresh(); }} />
    </DialogContent>
  </Dialog>;
}
