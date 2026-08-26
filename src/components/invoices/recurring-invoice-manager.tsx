"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";
import { createRecurringInvoiceRule, deleteRecurringInvoiceRule, updateRecurringInvoiceRule } from "@/lib/actions/recurring-invoices";
import { renderRecurringInvoiceNumber } from "@/lib/recurring-invoice-number";
import { useAppTransition } from "@/lib/transition-provider";

export type RecurringInvoiceRuleView = {
  id: string;
  clientId: string;
  projectId: string | null;
  frequency: "monthly" | "quarterly" | "yearly";
  startDate: string;
  endDate: string | null;
  nextRunDate: string;
  isActive: boolean;
  currency: string;
  numberPattern: string;
  lastSequence: number;
  notes: string | null;
  terms: string | null;
  lines: Array<{ description: string; quantity: number; unitPrice: number }>;
};

type Props = {
  rules: RecurringInvoiceRuleView[];
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; clientId: string; name: string }>;
  canWrite: boolean;
  defaultCurrency: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function RecurringInvoiceManager({ rules, clients, projects, canWrite, defaultCurrency }: Props) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [pending, setPending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    clientId: clients[0]?.id ?? "",
    projectId: "",
    frequency: "monthly" as "monthly" | "quarterly" | "yearly",
    startDate: today(),
    endDate: "",
    currency: defaultCurrency,
    numberPattern: "INV-{YYYY}-{SEQ}",
    description: "",
    quantity: "1",
    unitPrice: "0",
    notes: "",
    terms: "",
  });
  const filteredProjects = projects.filter((project) => project.clientId === form.clientId);
  const example = useMemo(() => {
    try { return renderRecurringInvoiceNumber(form.numberPattern, new Date().getFullYear(), 1); }
    catch { return t("Pola tidak valid", "Invalid pattern"); }
  }, [form.numberPattern, t]);

  function set(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const payload = {
        clientId: form.clientId,
        projectId: form.projectId || null,
        frequency: form.frequency,
        startDate: form.startDate,
        endDate: form.endDate || null,
        currency: form.currency,
        numberPattern: form.numberPattern,
        notes: form.notes || null,
        terms: form.terms || null,
        lines: [{ description: form.description, quantity: Number(form.quantity), unitPrice: Number(form.unitPrice) }],
      };
      if (editingId) await updateRecurringInvoiceRule(editingId, payload);
      else await createRecurringInvoiceRule(payload);
      toast.success(editingId ? t("Aturan invoice berulang diperbarui", "Recurring invoice rule updated") : t("Aturan invoice berulang dibuat", "Recurring invoice rule created"));
      setEditingId(null);
      setForm((current) => ({ ...current, description: "", unitPrice: "0" }));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal membuat aturan", "Failed to create rule"));
    } finally { setPending(false); }
  }

  function edit(rule: RecurringInvoiceRuleView) {
    const line = rule.lines[0] ?? { description: "", quantity: 1, unitPrice: 0 };
    setEditingId(rule.id);
    setForm({
      clientId: rule.clientId,
      projectId: rule.projectId ?? "",
      frequency: rule.frequency,
      startDate: rule.startDate,
      endDate: rule.endDate ?? "",
      currency: rule.currency,
      numberPattern: rule.numberPattern,
      description: line.description,
      quantity: String(line.quantity),
      unitPrice: String(line.unitPrice),
      notes: rule.notes ?? "",
      terms: rule.terms ?? "",
    });
    document.getElementById("recurring-invoice-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function toggle(rule: RecurringInvoiceRuleView) {
    setPending(true);
    try {
      await updateRecurringInvoiceRule(rule.id, { isActive: !rule.isActive });
      refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal memperbarui aturan", "Failed to update rule")); }
    finally { setPending(false); }
  }

  async function remove(ruleId: string) {
    if (!window.confirm(t("Hapus aturan invoice berulang ini?", "Delete this recurring invoice rule?"))) return;
    setPending(true);
    try {
      await deleteRecurringInvoiceRule(ruleId);
      toast.success(t("Aturan invoice berulang dihapus", "Recurring invoice rule deleted"));
      refresh();
    }
    catch (error) { toast.error(error instanceof Error ? error.message : t("Gagal menghapus aturan", "Failed to delete rule")); }
    finally { setPending(false); }
  }

  return (
    <Card id="recurring-invoices">
      <CardHeader><CardTitle>{t("Invoice Berulang", "Recurring Invoices")}</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">{t("Aturan aktif membuat invoice draft otomatis sesuai jadwal.", "Active rules create draft invoices automatically on schedule.")}</p>
        {canWrite && clients.length > 0 ? (
          <form id="recurring-invoice-form" onSubmit={submit} className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="recurring-client">{t("Klien", "Client")}</Label><select id="recurring-client" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.clientId} onChange={(e) => { set("clientId", e.target.value); set("projectId", ""); }} required>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-project">{t("Proyek (opsional)", "Project (optional)")}</Label><select id="recurring-project" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.projectId} onChange={(e) => set("projectId", e.target.value)}><option value="">—</option>{filteredProjects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-frequency">{t("Frekuensi", "Frequency")}</Label><select id="recurring-frequency" className="flex h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.frequency} onChange={(e) => set("frequency", e.target.value)}><option value="monthly">{t("Bulanan", "Monthly")}</option><option value="quarterly">{t("Kuartalan", "Quarterly")}</option><option value="yearly">{t("Tahunan", "Yearly")}</option></select></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-currency">{t("Mata uang", "Currency")}</Label><Input id="recurring-currency" maxLength={3} value={form.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} required /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-start">{t("Mulai", "Start")}</Label><Input id="recurring-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-end">{t("Selesai (opsional)", "End (optional)")}</Label><Input id="recurring-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} /></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="recurring-pattern">{t("Pola nomor", "Number pattern")}</Label><Input id="recurring-pattern" value={form.numberPattern} onChange={(e) => set("numberPattern", e.target.value)} required /><p className="text-xs text-muted-foreground">{t("Contoh", "Example")}: {example}. {t("Token: {YYYY}, {SEQ}.", "Tokens: {YYYY}, {SEQ}.")}</p></div>
            <div className="space-y-1.5 md:col-span-2"><Label htmlFor="recurring-description">{t("Deskripsi item", "Item description")}</Label><Input id="recurring-description" value={form.description} onChange={(e) => set("description", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-quantity">{t("Kuantitas", "Quantity")}</Label><Input id="recurring-quantity" type="number" min="0.01" step="0.01" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-price">{t("Harga satuan", "Unit price")}</Label><Input id="recurring-price" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} required /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-notes">{t("Catatan", "Notes")}</Label><Textarea id="recurring-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="recurring-terms">{t("Syarat", "Terms")}</Label><Textarea id="recurring-terms" value={form.terms} onChange={(e) => set("terms", e.target.value)} /></div>
            <div className="flex gap-2 md:col-span-2"><Button type="submit" disabled={pending} className="flex-1">{pending ? t("Menyimpan…", "Saving…") : editingId ? t("Simpan Perubahan", "Save Changes") : t("Tambah Aturan", "Add Rule")}</Button>{editingId ? <Button type="button" variant="outline" onClick={() => setEditingId(null)}>{t("Batal", "Cancel")}</Button> : null}</div>
          </form>
        ) : null}
        <div className="space-y-2">
          {rules.length === 0 ? <p className="text-sm text-muted-foreground">{t("Belum ada aturan invoice berulang.", "No recurring invoice rules yet.")}</p> : rules.map((rule) => {
            const client = clients.find((item) => item.id === rule.clientId)?.name ?? t("Klien", "Client");
            return <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-medium">{client} · {rule.numberPattern}</p><p className="text-xs text-muted-foreground">{rule.frequency} · {t("Berikutnya", "Next")}: {rule.nextRunDate} · {rule.currency} · {rule.isActive ? t("Aktif", "Active") : t("Dijeda", "Paused")}</p></div>{canWrite ? <div className="flex gap-2"><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => edit(rule)}>{t("Edit", "Edit")}</Button><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => toggle(rule)}>{rule.isActive ? t("Jeda", "Pause") : t("Aktifkan", "Activate")}</Button><Button type="button" size="sm" variant="destructive" disabled={pending} onClick={() => remove(rule.id)}>{t("Hapus", "Delete")}</Button></div> : null}</div>;
          })}
        </div>
      </CardContent>
    </Card>
  );
}
