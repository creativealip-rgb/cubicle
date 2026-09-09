"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveInvoiceEditor } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Line = { description: string; quantity: number; unitPrice: number; sourceType?: string | null };
type Option = { id: string; name: string; clientId?: string | null };

export function InvoiceFullEditor({ invoice, initialItems, clients, projects, sourceActions, children }: {
  invoice: { id: string; clientId: string; projectId: string | null; invoiceNumber: string; issueDate: string; dueDate: string | null; currency: string; discount: number; tax: number; chargeType: "none" | "tax" | "admin_fee"; notes: string; terms: string; status: string };
  initialItems: Line[];
  clients: Option[];
  projects: Option[];
  sourceActions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { t } = useT();
  const router = useRouter();
  const sourceBacked = initialItems.some((item) => item.sourceType === "time_entry" || item.sourceType === "project");
  const locked = ["cancelled", "archived"].includes(invoice.status);
  const [saving, setSaving] = useState(false);
  const [chargeType, setChargeType] = useState<"none" | "tax" | "admin_fee">(invoice.chargeType);
  const [form, setForm] = useState({ ...invoice, items: initialItems.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })) });
  const clientProjects = projects.filter((project) => project.clientId === form.clientId);
  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0), [form.items]);
  const total = Math.max(0, subtotal - Number(form.discount || 0) + Number(form.tax || 0));
  const updateLine = (index: number, key: keyof Line, value: string) => setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: key === "description" ? value : Number(value) } : item) }));

  async function save() {
    setSaving(true);
    try {
      await saveInvoiceEditor(invoice.id, {
        clientId: form.clientId,
        projectId: form.projectId || null,
        invoiceNumber: form.invoiceNumber,
        issueDate: form.issueDate,
        dueDate: form.dueDate || null,
        currency: form.currency,
        discount: Number(form.discount),
        tax: Number(form.tax),
        status: form.status as "draft" | "sent" | "viewed" | "overdue",
        chargeType,
        notes: form.notes,
        terms: form.terms,
        items: form.items,
      });
      toast.success(t("Invoice disimpan", "Invoice saved"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menyimpan invoice", "Failed to save invoice"));
    } finally {
      setSaving(false);
    }
  }

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
    <div className="space-y-5 min-w-0">
      <Card>
        <CardHeader><CardTitle>{t("Detail Invoice", "Invoice Details")}</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label htmlFor="invoice-number">{t("Nomor Invoice", "Invoice Number")}</Label><Input id="invoice-number" value={form.invoiceNumber} disabled={locked} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} /></div>
          <div className="space-y-2"><Label>{t("Klien", "Client")}</Label><Select value={form.clientId} disabled={locked || sourceBacked} onValueChange={(clientId) => setForm({ ...form, clientId, projectId: null })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>{t("Proyek", "Project")}</Label><Select value={form.projectId || "none"} disabled={locked || sourceBacked} onValueChange={(projectId) => setForm({ ...form, projectId: projectId === "none" ? null : projectId })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("Tanpa proyek", "No project")}</SelectItem>{clientProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="issue-date">{t("Tanggal Terbit", "Issue Date")}</Label><Input id="issue-date" type="date" value={form.issueDate} disabled={locked} onChange={(e) => setForm({ ...form, issueDate: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="due-date">{t("Jatuh Tempo", "Due Date")}</Label><Input id="due-date" type="date" value={form.dueDate || ""} disabled={locked} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} /></div>
          <div className="space-y-2"><Label htmlFor="currency">{t("Mata Uang", "Currency")}</Label><Input id="currency" maxLength={3} value={form.currency} disabled={locked} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} /></div>
          <div className="space-y-2"><Label>{t("Status", "Status")}</Label><Select value={form.status} disabled={locked || form.status === "paid"} onValueChange={(status) => setForm({ ...form, status })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="sent">Sent</SelectItem><SelectItem value="viewed">Viewed</SelectItem><SelectItem value="overdue">Overdue</SelectItem></SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between"><div><CardTitle>{t("Rincian Item", "Line Items")}</CardTitle>{sourceBacked && <p className="text-xs text-muted-foreground mt-1">{t("Item sumber dikelola dari proyek atau time entry.", "Source items are managed from project or time entries.")}</p>}</div>{!locked && sourceActions}</CardHeader>
        <CardContent className="space-y-3">
          {form.items.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t("Belum ada item.", "No items yet.")}</p>}
          {form.items.map((item, index) => <div key={index} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[minmax(0,1fr)_90px_150px_40px] sm:items-end">
            <div className="space-y-1"><Label className="text-xs">{t("Deskripsi", "Description")}</Label><Input aria-label={`${t("Deskripsi", "Description")} ${index + 1}`} value={item.description} disabled={locked || sourceBacked} onChange={(e) => updateLine(index, "description", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Qty</Label><Input aria-label={`Qty ${index + 1}`} type="number" min="0.01" step="0.01" value={item.quantity} disabled={locked || sourceBacked} onChange={(e) => updateLine(index, "quantity", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">{t("Tarif", "Rate")}</Label><Input aria-label={`${t("Tarif", "Rate")} ${index + 1}`} type="number" min="0" step="0.01" value={item.unitPrice} disabled={locked || sourceBacked} onChange={(e) => updateLine(index, "unitPrice", e.target.value)} /></div>
            {!sourceBacked && !locked && <Button type="button" size="icon" variant="ghost" aria-label={`${t("Hapus item", "Delete item")} ${index + 1}`} onClick={() => setForm({ ...form, items: form.items.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
          </div>)}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle>{t("Catatan & Ketentuan", "Notes & Terms")}</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label htmlFor="invoice-notes">{t("Catatan", "Notes")}</Label><Textarea id="invoice-notes" rows={5} value={form.notes} disabled={locked} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div><div className="space-y-2"><Label htmlFor="invoice-terms">{t("Ketentuan", "Terms")}</Label><Textarea id="invoice-terms" rows={5} value={form.terms} disabled={locked} onChange={(e) => setForm({ ...form, terms: e.target.value })} /></div></CardContent></Card>
    </div>

    <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
      <Card><CardHeader><CardTitle>{t("Ringkasan", "Summary")}</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex justify-between text-sm"><span>{t("Subtotal", "Subtotal")}</span><strong className="font-mono">{formatMoney(subtotal, form.currency)}</strong></div>
        <div className="space-y-1"><Label htmlFor="invoice-discount">{t("Diskon", "Discount")}</Label><Input id="invoice-discount" type="number" min="0" value={form.discount} disabled={locked} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label>{t("Biaya Tambahan", "Additional Charge")}</Label><Select value={chargeType} disabled={locked} onValueChange={(value: "none" | "tax" | "admin_fee") => { setChargeType(value); if (value === "none") setForm({ ...form, tax: 0 }); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("Tanpa Pajak / Biaya", "No Tax / Fee")}</SelectItem><SelectItem value="tax">{t("Pajak", "Tax")}</SelectItem><SelectItem value="admin_fee">{t("Biaya Admin", "Admin Fee")}</SelectItem></SelectContent></Select>{chargeType !== "none" && <Input aria-label={chargeType === "tax" ? t("Pajak", "Tax") : t("Biaya Admin", "Admin Fee")} type="number" min="0" value={form.tax} disabled={locked} onChange={(e) => setForm({ ...form, tax: Number(e.target.value) })} />}</div>
        <div className="flex justify-between border-t pt-3"><span className="font-semibold">Total</span><strong className="font-mono text-lg">{formatMoney(total, form.currency)}</strong></div>
        <LoadingButton onClick={save} loading={saving} disabled={locked} className="w-full"><Save className="h-4 w-4 mr-2" />{t("Simpan Perubahan", "Save Changes")}</LoadingButton>
      </CardContent></Card>
      {children}
    </aside>
    <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 p-3 backdrop-blur xl:hidden"><LoadingButton onClick={save} loading={saving} disabled={locked} className="w-full"><Save className="h-4 w-4 mr-2" />{t("Simpan Perubahan", "Save Changes")}</LoadingButton></div>
  </div>;
}
