"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
import { useT } from "@/lib/i18n-client";

interface ClientOption {
  id: string;
  name: string;
}

export interface ServiceOption {
  id: string;
  name: string;
  description: string;
  defaultPrice: number;
  defaultUnit: string;
}

interface ProposalTemplateOption {
  id: string;
  name: string;
  body: string | null;
  contentBlocks?: unknown;
  defaultCurrency: string;
  defaultTaxRate: string;
  defaultDownPaymentPercent: string;
  lineItems: string | null;
}

interface ProposalFormProps {
  workspaceId: string;
  defaultCurrency: string;
  defaultTaxRate: string;
  clients: ClientOption[];
  services?: ServiceOption[];
  templates?: ProposalTemplateOption[];
}

interface LineItemDraft {
  description: string;
  quantity: number;
  unitPrice: number;
}

const blankItem = (): LineItemDraft => ({ description: "", quantity: 1, unitPrice: 0 });
const defaultValidUntil = () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function ProposalForm({ workspaceId, defaultCurrency, defaultTaxRate, clients: _clients, services = [], templates = [] }: ProposalFormProps) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => ({
    clientName: "",
    clientEmail: "",
    companyName: "",
    title: "",
    body: "",
    currency: defaultCurrency,
    taxRate: parseFloat(defaultTaxRate) || 0,
    downPaymentPercent: 50,
    validUntil: defaultValidUntil(),
  }));
  const [items, setItems] = useState<LineItemDraft[]>([blankItem()]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

  function applyTemplate(id: string) {
    const template = templates.find((item) => item.id === id);
    if (!template) return;
    setSelectedTemplateId(id);
    let nextItems: LineItemDraft[] = [blankItem()];
    try {
      const parsed = template.lineItems ? JSON.parse(template.lineItems) : [];
      if (Array.isArray(parsed) && parsed.length > 0) nextItems = parsed.map((item) => ({ description: String(item.description ?? ""), quantity: Number(item.quantity) || 1, unitPrice: Number(item.unitPrice) || 0 }));
    } catch { /* ignore malformed legacy template items */ }
    setForm((prev) => ({ ...prev, body: template.body || "", currency: template.defaultCurrency || prev.currency, taxRate: Number(template.defaultTaxRate) || 0, downPaymentPercent: Number(template.defaultDownPaymentPercent) || 0 }));
    setItems(nextItems);
  }

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
        clientName: form.clientName,
        clientEmail: form.clientEmail || undefined,
        companyName: form.companyName || undefined,
        title: form.title,
        body: form.body || undefined,
        templateId: selectedTemplateId,
        lineItems,
        currency: form.currency,
        taxRate: form.taxRate,
        downPaymentPercent: form.downPaymentPercent,
        validUntil: form.validUntil,
      });
      toast.success("Proposal dibuat");
      router.push(`/app/proposals/${created.id}/edit`);
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
          <CardTitle className="text-base flex items-center justify-between gap-3">
            Detail
            {templates.length > 0 && (
              <Select onValueChange={applyTemplate}>
                <SelectTrigger className="w-52"><SelectValue placeholder={t("Pakai template", "Use template")} /></SelectTrigger>
                <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1"><Label htmlFor="clientName">Nama client</Label><Input id="clientName" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} required /></div>
            <div className="space-y-1"><Label htmlFor="clientEmail">Email client</Label><Input id="clientEmail" type="email" value={form.clientEmail} onChange={(e) => setForm({ ...form, clientEmail: e.target.value })} /></div>
            <div className="space-y-1"><Label htmlFor="companyName">Nama perusahaan</Label><Input id="companyName" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} /></div>
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
        <CardContent className="space-y-3">
          {items.map((li, i) => (
            <div key={i} className="space-y-2 rounded-lg border p-3 bg-slate-50/50">
              {services.length > 0 && (
                <div>
                  <Label htmlFor={`service-${i}`} className="text-xs">Impor dari Katalog Layanan</Label>
                  <Select
                    onValueChange={(serviceId) => {
                      const s = services.find((srv) => srv.id === serviceId);
                      if (s) {
                        updateItem(i, {
                          description: s.description ? `${s.name} — ${s.description}` : s.name,
                          unitPrice: s.defaultPrice || li.unitPrice,
                        });
                      }
                    }}
                  >
                    <SelectTrigger id={`service-${i}`} className="bg-white text-xs h-8 mt-1">
                      <SelectValue placeholder={t("Pilih layanan katalog...", "Select catalog service...")} />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((srv) => (
                        <SelectItem key={srv.id} value={srv.id} className="text-xs">
                          {srv.name} {srv.defaultPrice > 0 ? `(${form.currency === "IDR" ? "Rp" : form.currency} ${srv.defaultPrice.toLocaleString()})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-6">
                  <Label htmlFor={`desc-${i}`} className="text-xs">Deskripsi Item</Label>
                  <Input id={`desc-${i}`} className="bg-white text-xs" value={li.description} onChange={(e) => updateItem(i, { description: e.target.value })} placeholder="contoh: Desain logo / Landing page" />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Label htmlFor={`qty-${i}`} className="text-xs">Qty</Label>
                  <Input id={`qty-${i}`} className="bg-white text-xs" type="number" min="0" step="0.5" value={li.quantity} onChange={(e) => updateItem(i, { quantity: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <Label htmlFor={`price-${i}`} className="text-xs">Harga Satuan</Label>
                  <Input id={`price-${i}`} className="bg-white text-xs" type="number" min="0" step="0.01" value={li.unitPrice} onChange={(e) => updateItem(i, { unitPrice: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="h-8 w-8 text-slate-500 hover:text-red-600" aria-label="Hapus item">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
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
        <LoadingButton type="submit" loading={loading} loadingText="Membuat...">{"Buat draft"}</LoadingButton>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Batal</Button>
      </div>
    </form>
  );
}
