"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { createEmptyInvoiceDraft } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

type ClientOption = { id: string; name: string; companyName: string | null };
type Props = { clients: ClientOption[]; proposedInvoiceNumber: string };

export function InvoiceCreateDialog({ clients, proposedInvoiceNumber }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const [clientId, setClientId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState(proposedInvoiceNumber);
  const selectedClient = clients.find((client) => client.id === clientId);
  const filteredClients = useMemo(() => clients.filter((client) => `${client.companyName ?? ""} ${client.name}`.toLowerCase().includes(clientSearch.trim().toLowerCase())).sort((a, b) => (a.companyName || a.name).localeCompare(b.companyName || b.name)), [clients, clientSearch]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!clientId) return toast.error(t("Pilih klien dulu", "Select a client first"));
    setLoading(true);
    try {
      const result = await createEmptyInvoiceDraft({ clientId, invoiceNumber });
      const invoiceId = result.id;
      setOpen(false);
      router.push(`/app/invoices/${invoiceId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal membuat invoice", "Failed to create invoice"));
    } finally {
      setLoading(false);
    }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button size="sm" className="gap-1"><Plus className="h-4 w-4" /> {t("Invoice Baru", "New Invoice")}</Button></DialogTrigger>
    <DialogContent className="w-[calc(100%-1rem)] p-4 sm:max-w-md sm:p-6">
      <DialogHeader><DialogTitle>{t("Buat Invoice", "Create Invoice")}</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-invoice-number">{t("Nomor Invoice", "Invoice Number")}</Label>
          <Input id="new-invoice-number" name="invoiceNumber" value={invoiceNumber} onChange={(event) => setInvoiceNumber(event.target.value.toUpperCase())} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-invoice-client">{t("Klien", "Client")}</Label>
          <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
            <PopoverAnchor asChild><div className="relative">
              <Input id="new-invoice-client" name="clientId" role="combobox" aria-expanded={clientSearchOpen} autoComplete="off" value={clientSearchOpen ? clientSearch : selectedClient?.companyName || selectedClient?.name || ""} placeholder={t("Cari klien", "Search client")} onFocus={() => setClientSearchOpen(true)} onChange={(event) => { setClientSearch(event.target.value); setClientSearchOpen(true); }} required className="pr-9" />
              <button type="button" aria-label={t("Buka daftar klien", "Open client list")} onClick={() => setClientSearchOpen((value) => !value)} className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground"><ChevronDown className="h-4 w-4" /></button>
            </div></PopoverAnchor>
            <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-1" onOpenAutoFocus={(event) => event.preventDefault()}>
              <div className="max-h-60 overflow-y-auto">{filteredClients.length ? filteredClients.map((client) => <button key={client.id} type="button" role="option" aria-selected={client.id === clientId} className="flex min-h-10 w-full items-center rounded-md px-3 text-left text-sm hover:bg-muted" onClick={() => { setClientId(client.id); setClientSearch(""); setClientSearchOpen(false); }}>{client.companyName || client.name}</button>) : <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t("Klien tidak ditemukan", "No clients found")}</p>}</div>
            </PopoverContent>
          </Popover>
        </div>
        <LoadingButton type="submit" loading={loading} loadingText={t("Membuat…", "Creating…")} className="w-full">{t("Buat Invoice", "Create Invoice")}</LoadingButton>
      </form>
    </DialogContent>
  </Dialog>;
}

export type InvoiceCreateDialogProps = Props;
