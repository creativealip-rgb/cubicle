"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InvoiceForm } from "@/components/forms/invoice-form";

export function ProjectInvoiceCreateDialog({ project, client, baseCurrency, currencyRates = [] }: {
  project: { id: string; name: string; clientId: string; billingType: string; currency: string; budget: string | null; rate: string | null; packagePrice: string | null; packageCustomPrice: string | null };
  client: { id: string; name: string; companyName: string | null };
  baseCurrency: string;
  currencyRates?: Array<{ fromCurrency: string; rate: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const handleSuccess = () => { setOpen(false); router.refresh(); };

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> Buat Invoice</Button></DialogTrigger>
    <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-3xl sm:p-6">
      <DialogHeader><DialogTitle>Buat Invoice Proyek</DialogTitle></DialogHeader>
      <InvoiceForm mode="create" scopedClientId={client.id} scopedProjectId={project.id} defaultValues={{ clientId: client.id, projectId: project.id, currency: project.currency }} clients={[client]} projects={[project]} baseCurrency={baseCurrency} currencyRates={currencyRates} onSuccess={handleSuccess} />
    </DialogContent>
  </Dialog>;
}
