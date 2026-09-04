"use client";

import { useMemo, useState } from "react";
import { CalendarClock, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";
import { createRecurringInvoiceRule, deleteRecurringInvoiceRule, generateRecurringInvoiceNow, updateRecurringInvoiceRule } from "@/lib/actions/recurring-invoices";
import { renderRecurringInvoiceNumber } from "@/lib/recurring-invoice-number";
import { useAppTransition } from "@/lib/transition-provider";
import { formatMoney } from "@/lib/utils";

export type RecurringInvoiceRuleView = {
  id: string; clientId: string; projectId: string | null;
  frequency: "monthly" | "quarterly" | "yearly";
  startDate: string; endDate: string | null; nextRunDate: string; isActive: boolean;
  currency: string; numberPattern: string; lastSequence: number; notes: string | null; terms: string | null;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
};
type Props = { rules: RecurringInvoiceRuleView[]; clients: Array<{ id: string; name: string }>; projects: Array<{ id: string; clientId: string; name: string }>; canWrite: boolean; defaultCurrency: string };
type RecurringInvoiceForm = {
  clientId: string; projectId: string; frequency: RecurringInvoiceRuleView["frequency"];
  startDate: string; endDate: string; currency: string; numberPattern: string;
  description: string; quantity: string; unitPrice: string; notes: string; terms: string;
};
const today = () => new Date().toISOString().slice(0, 10);

export function RecurringInvoiceManager({ rules, clients, projects, canWrite, defaultCurrency }: Props) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const blank = (): RecurringInvoiceForm => ({ clientId: clients[0]?.id ?? "", projectId: "", frequency: "monthly", startDate: today(), endDate: "", currency: defaultCurrency, numberPattern: "INV-{YYYY}-{SEQ}", description: "", quantity: "1", unitPrice: "0", notes: "", terms: "" });
  const [form, setForm] = useState(blank);
  const filteredProjects = projects.filter((project) => project.clientId === form.clientId);
  const example = useMemo(() => { try { return renderRecurringInvoiceNumber(form.numberPattern, new Date().getFullYear(), 1); } catch { return t("Pola tidak valid", "Invalid pattern"); } }, [form.numberPattern, t]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const frequencyLabel = (value: RecurringInvoiceRuleView["frequency"]) => ({ monthly: t("Bulanan", "Monthly"), quarterly: t("Kuartalan", "Quarterly"), yearly: t("Tahunan", "Yearly") })[value];

  function create() { setEditingId(null); setForm(blank()); setOpen(true); }
  function edit(rule: RecurringInvoiceRuleView) {
    const line = rule.lines[0] ?? { description: "", quantity: 1, unitPrice: 0 };
    setEditingId(rule.id);
    setForm({ clientId: rule.clientId, projectId: rule.projectId ?? "", frequency: rule.frequency, startDate: rule.startDate, endDate: rule.endDate ?? "", currency: rule.currency, numberPattern: rule.numberPattern, description: line.description, quantity: String(line.quantity), unitPrice: String(line.unitPrice), notes: rule.notes ?? "", terms: rule.terms ?? "" });
    setOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true);
    try {
      const payload = { clientId: form.clientId, projectId: form.projectId || null, frequency: form.frequency, startDate: form.startDate, endDate: form.endDate || null, currency: form.currency, numberPattern: form.numberPattern, notes: form.notes || null, terms: form.terms || null, lines: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }] };
      if (editingId) await updateRecurringInvoiceRule(editingId, payload); else await createRecurringInvoiceRule(payload);
      toast.success(editingId ? t("Invoice berulang diperbarui", "Recurring invoice updated") : t("Invoice berulang dibuat", "Recurring invoice created"));
      setOpen(false); refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal menyimpan", "Failed to save")); } finally { setPending(false); }
  }
  async function toggle(rule: RecurringInvoiceRuleView) { setPending(true); try { await updateRecurringInvoiceRule(rule.id, { isActive: !rule.isActive }); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal memperbarui", "Failed to update")); } finally { setPending(false); } }
  async function generate(ruleId: string) { setPending(true); try { const id = await generateRecurringInvoiceNow(ruleId); toast.success(id ? t("Draft invoice dibuat", "Draft invoice generated") : t("Jadwal belum jatuh tempo", "Schedule is not due yet")); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal membuat draft", "Failed to generate draft")); } finally { setPending(false); } }
  async function remove(ruleId: string) { setPending(true); try { await deleteRecurringInvoiceRule(ruleId); setDeleteId(null); toast.success(t("Invoice berulang dihapus", "Recurring invoice deleted")); refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal menghapus", "Failed to delete")); } finally { setPending(false); } }

  return <section id="recurring-invoices" className="rounded-xl border bg-card">
    <div className="flex flex-col gap-3 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div><h2 className="font-semibold">{t("Invoice Berulang", "Recurring Invoices")}</h2><p className="text-sm text-muted-foreground">{t("Buat draft invoice otomatis sesuai jadwal.", "Create draft invoices automatically on schedule.")}</p></div>
      {canWrite && clients.length > 0 ? <Button size="sm" onClick={create}><Plus className="mr-1.5 h-4 w-4" />{t("Invoice berulang baru", "New recurring invoice")}</Button> : null}
    </div>
    {rules.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center px-4 py-8 text-center"><span className="mb-3 rounded-full bg-muted p-3"><CalendarClock className="h-5 w-5 text-muted-foreground" /></span><p className="font-medium">{t("Belum ada invoice berulang", "No recurring invoices yet")}</p><p className="mt-1 max-w-md text-sm text-muted-foreground">{t("Otomatiskan tagihan rutin. Invoice hasil tetap berupa draft untuk diperiksa sebelum dikirim.", "Automate repeat billing. Generated invoices stay as drafts for review before sending.")}</p></div> : <div className="divide-y">{rules.map((rule) => {
      const client = clients.find((item) => item.id === rule.clientId)?.name ?? t("Klien", "Client");
      const project = projects.find((item) => item.id === rule.projectId)?.name;
      const amount = rule.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
      return <div key={rule.id} className="grid gap-3 px-4 py-3 sm:px-5 lg:grid-cols-[minmax(0,1.5fr)_110px_140px_130px_auto] lg:items-center">
        <div className="min-w-0"><p className="truncate font-medium">{client}</p><p className="truncate text-xs text-muted-foreground">{project || t("Tanpa proyek", "No project")} · {rule.numberPattern}</p></div>
        <div><p className="text-xs text-muted-foreground">{t("Jadwal", "Schedule")}</p><p className="text-sm">{frequencyLabel(rule.frequency)}</p></div>
        <div><p className="text-xs text-muted-foreground">{t("Nilai", "Amount")}</p><p className="text-sm font-medium tabular-nums">{formatMoney(amount, rule.currency)}</p></div>
        <div><p className="text-xs text-muted-foreground">{t("Berikutnya", "Next")}</p><p className="text-sm tabular-nums">{rule.nextRunDate}</p></div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end"><span className={rule.isActive ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700" : "rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground"}>{rule.isActive ? t("Aktif", "Active") : t("Dijeda", "Paused")}</span>{canWrite ? <><Button size="sm" variant="ghost" disabled={pending} onClick={() => generate(rule.id)}>{t("Buat draft sekarang", "Generate draft now")}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => edit(rule)}>{t("Edit", "Edit")}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => toggle(rule)}>{rule.isActive ? t("Jeda", "Pause") : t("Aktifkan", "Activate")}</Button><Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => setDeleteId(rule.id)}>{t("Hapus", "Delete")}</Button></> : null}</div>
      </div>;
    })}</div>}

    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}><DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-2xl"><form onSubmit={submit} className="flex max-h-[90vh] flex-col"><DialogHeader className="shrink-0 border-b px-6 py-5 text-left"><DialogTitle>{editingId ? t("Edit invoice berulang", "Edit recurring invoice") : t("Invoice berulang baru", "New recurring invoice")}</DialogTitle><DialogDescription>{t("Atur klien, jadwal, dan detail draft invoice.", "Set client, schedule, and draft invoice details.")}</DialogDescription></DialogHeader><div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
      <div className="space-y-1.5"><Label htmlFor="recurring-client">{t("Klien", "Client")}</Label><select id="recurring-client" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.clientId} onChange={(e) => { set("clientId", e.target.value); set("projectId", ""); }} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-project">{t("Proyek (opsional)", "Project (optional)")}</Label><select id="recurring-project" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}><option value="">—</option>{filteredProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-frequency">{t("Frekuensi", "Frequency")}</Label><select id="recurring-frequency" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.frequency} onChange={(e) => set("frequency", e.target.value)}><option value="monthly">{t("Bulanan", "Monthly")}</option><option value="quarterly">{t("Kuartalan", "Quarterly")}</option><option value="yearly">{t("Tahunan", "Yearly")}</option></select></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-currency">{t("Mata uang", "Currency")}</Label><Input id="recurring-currency" maxLength={3} value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} required /></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-start">{t("Mulai", "Start")}</Label><Input id="recurring-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required /></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-end">{t("Selesai (opsional)", "End (optional)")}</Label><Input id="recurring-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
      <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="recurring-description">{t("Deskripsi item", "Item description")}</Label><Input id="recurring-description" value={form.description} onChange={(e) => set("description", e.target.value)} required /></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-quantity">{t("Kuantitas", "Quantity")}</Label><Input id="recurring-quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required /></div>
      <div className="space-y-1.5"><Label htmlFor="recurring-price">{t("Harga satuan", "Unit price")}</Label><Input id="recurring-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} required /></div>
      <details className="rounded-lg border p-3 sm:col-span-2"><summary className="cursor-pointer text-sm font-medium">{t("Pengaturan lanjutan", "Advanced settings")}</summary><div className="mt-4 grid gap-4"><div className="space-y-1.5"><Label htmlFor="recurring-pattern">{t("Pola nomor", "Number pattern")}</Label><Input id="recurring-pattern" value={form.numberPattern} onChange={(e) => set("numberPattern", e.target.value)} required /><p className="text-xs text-muted-foreground">{t("Contoh", "Example")}: {example}</p></div><div className="space-y-1.5"><Label htmlFor="recurring-notes">{t("Catatan", "Notes")}</Label><Textarea id="recurring-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div><div className="space-y-1.5"><Label htmlFor="recurring-terms">{t("Syarat", "Terms")}</Label><Textarea id="recurring-terms" value={form.terms} onChange={(e) => set("terms", e.target.value)} /></div></div></details>
    </div><DialogFooter className="shrink-0 border-t bg-background px-6 py-4"><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>{t("Batal", "Cancel")}</Button><Button type="submit" disabled={pending}>{pending ? t("Menyimpan…", "Saving…") : t("Simpan invoice berulang", "Save recurring invoice")}</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={deleteId !== null} onOpenChange={(next) => !next && !pending && setDeleteId(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{t("Hapus invoice berulang?", "Delete recurring invoice?")}</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">{t("Invoice draft yang sudah dibuat tidak ikut dihapus.", "Existing generated draft invoices will not be deleted.")}</p><DialogFooter><Button variant="outline" disabled={pending} onClick={() => setDeleteId(null)}>{t("Batal", "Cancel")}</Button><Button variant="destructive" disabled={pending || !deleteId} onClick={() => deleteId && remove(deleteId)}>{t("Hapus", "Delete")}</Button></DialogFooter></DialogContent></Dialog>
  </section>;
}
