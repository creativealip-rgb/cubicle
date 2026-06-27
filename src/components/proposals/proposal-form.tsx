"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createProposal } from "@/lib/actions/proposals";

interface ClientOption {
  id: string;
  name: string;
}

interface ProposalFormProps {
  workspaceId: string;
  defaultCurrency: string;
  defaultTaxRate: string;
  clients: ClientOption[];
}

interface LineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
}

const blankItem = (): LineItemDraft => ({ description: "", quantity: 1, unitPrice: 0 });
const defaultValidUntil = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function ProposalForm({ workspaceId, defaultCurrency, defaultTaxRate, clients }: ProposalFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    clientId: clients[0]?.id ?? "",
    title: "",
    body: "",
    currency: defaultCurrency,
    taxRate: parseFloat(defaultTaxRate) || 0,
    downPaymentPercent: 50,
    validUntil: defaultValidUntil(),
  }));
  const [items, setItems] = useState<LineItemDraft[]>([blankItem()]);

  const subtotal = items.reduce((s, li) => s + li.quantity * li.unitPrice, 0);
  const tax = subtotal * (form.taxRate / 100);
  const total = subtotal + tax;

  function updateItem(i: number, patch: Partial<LineItemDraft>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (items.length === 0 || items.every((li) => !li.description.trim())) {
      toast.error("Tambahkan minimal satu item");
      return;
    }
    setLoading(true);
    try {
      const lineItems = items
        .filter((li) => li.description.trim())
        .map((li) => ({
          description: li.description,
          quantity: li.quantity,
          unitPrice: li.unitPrice,
          amount: li.quantity * li.unitPrice,
        }));
      const created = await createProposal({
        workspaceId,
        clientId: form.clientId,
        title: form.title,
        body: form.body || undefined,
        lineItems,
        currency: form.currency,
        taxRate: form.taxRate,
        downPaymentPercent: form.downPaymentPercent,
        validUntil: form.validUntil,
      });
      toast.success("Proposal dibuat");
      router.push(`/app/proposals/${created.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="client">Klien</Label>
              <Select value={form.clientId} onValueChange={(v) => setForm({ ...form, clientId: v })}>
                <SelectTrigger id="client"><SelectValue placeholder="Pilih klien" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="title">Judul</Label>
              <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="contoh: Brand refresh — fase 1" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="currency">Mata Uang</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="valid">Berlaku sampai</Label>
              <Input id="valid" type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tax">Pajak (%)</Label>
              <Input id="tax" type="number" min="0" max="100" step="0.01" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dp">DP (%)</Label>
              <Input id="dp" type="number" min="0" max="100" step="1" value={form.downPaymentPercent} onChange={(e) => setForm({ ...form, downPaymentPercent: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="body">Scope / deskripsi (opsional)</Label>
            <Textarea id="body" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Yang termasuk, timeline, asumsi…" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between">
            Rincian item
            <Button type="button" variant="ghost" size="sm" onClick={() => setItems([...items, blankItem()])}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Tambah
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {items.map((li, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-6">
                <Label htmlFor={`desc-${i}`} className="text-xs">Deskripsi</Label>
                <Input id={`desc-${i}`} value={li.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="contoh: Desain logo" />
              </div>
              <div className="col-span-2">
                <Label htmlFor={`qty-${i}`} className="text-xs">Qty</Label>
                <Input id={`qty-${i}`} type="number" min="0" step="0.5" value={li.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-3">
                <Label htmlFor={`price-${i}`} className="text-xs">Harga satuan</Label>
                <Input id={`price-${i}`} type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="col-span-1">
                {items.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="h-9 w-9 text-slate-500 hover:text-red-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          <div className="border-t pt-3 text-sm space-y-1">
            <div className="flex justify-end gap-8"><span className="text-slate-500">Subtotal</span><span className="tabular-nums w-32 text-right">{form.currency === "IDR" ? "Rp" : form.currency} {subtotal.toLocaleString(form.currency === "IDR" ? "id-ID" : "en-US")}</span></div>
            {form.taxRate > 0 && (
              <div className="flex justify-end gap-8"><span className="text-slate-500">Pajak ({form.taxRate}%)</span><span className="tabular-nums w-32 text-right">{form.currency === "IDR" ? "Rp" : form.currency} {tax.toLocaleString(form.currency === "IDR" ? "id-ID" : "en-US")}</span></div>
            )}
            <div className="flex justify-end gap-8 pt-2 border-t font-semibold"><span>Total</span><span className="tabular-nums w-32 text-right">{form.currency === "IDR" ? "Rp" : form.currency} {total.toLocaleString(form.currency === "IDR" ? "id-ID" : "en-US")}</span></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>{loading ? "Membuat..." : "Buat draft"}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Batal</Button>
      </div>
    </form>
  );
}
