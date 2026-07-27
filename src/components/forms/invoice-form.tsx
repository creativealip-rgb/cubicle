"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { addDaysToIsoDate, calculateDraftItemsSubtotal } from "@/lib/invoice-create-form";
import { buildRateMap } from "@/lib/currency-base";
import { convertCurrency, resolveProjectAmount } from "@/lib/invoice-project-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ClientOption {
  id: string;
  name: string;
  companyName: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
  clientId: string;
  billingType: string;
  currency: string;
  budget: string | null;
  rate: string | null;
  packagePrice: string | null;
  packageCustomPrice: string | null;
}

interface TemplateOption {
  id: string;
  name: string;
  defaultCurrency: string | null;
  defaultTaxRate: string | null;
  notes: string | null;
  terms: string | null;
}

interface TimeEntryOption {
  id: string;
  clientId: string | null;
  projectId: string | null;
  description: string | null;
  durationMinutes: number | null;
  hourlyRate: string | null;
}

interface InvoiceFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    clientId?: string;
    projectId?: string;
    issueDate?: string;
    dueDate?: string;
    currency?: string;
    notes?: string;
    terms?: string;
  };
  clients: ClientOption[];
  projects?: ProjectOption[];
  templates?: TemplateOption[];
  timeEntries?: TimeEntryOption[];
  baseCurrency?: string;
  currencyRates?: Array<{ fromCurrency: string; rate: string }>;
  onSuccess?: () => void;
}

export function InvoiceForm({ mode, defaultValues, clients, projects, templates, timeEntries = [], baseCurrency = "IDR", currencyRates = [], onSuccess }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [dueDateTouched, setDueDateTouched] = useState(Boolean(defaultValues?.dueDate));
  const [selectedTimeIds, setSelectedTimeIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(defaultValues?.projectId ? [defaultValues.projectId] : []);
  const [form, setForm] = useState({
    clientId: defaultValues?.clientId ?? "",
    projectId: "",
    issueDate: defaultValues?.issueDate ?? new Date().toISOString().split("T")[0],
    dueDate: defaultValues?.dueDate ?? addDaysToIsoDate(defaultValues?.issueDate ?? new Date().toISOString().split("T")[0], 14),
    currency: defaultValues?.currency ?? baseCurrency,
    notes: defaultValues?.notes ?? "",
    terms: defaultValues?.terms ?? "",
  });

  // Filter projects and eligible timesheets by selected client/project.
  const clientProjects = projects?.filter(p => p.clientId === form.clientId) ?? [];
  const rateMap = buildRateMap(currencyRates);
  const selectedProjects = clientProjects.filter((project) => selectedProjectIds.includes(project.id));
  const projectItems = selectedProjects.map((project) => {
    const originalAmount = resolveProjectAmount({ billingType: project.billingType, budget: project.budget ? Number(project.budget) : null, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null });
    const converted = convertCurrency(originalAmount, project.currency, form.currency, baseCurrency, rateMap);
    return { description: project.name, quantity: 1, unitPrice: converted?.amount ?? 0, projectId: project.id, originalAmount, originalCurrency: project.currency, conversionRate: converted?.rate ?? null };
  });
  const missingRateProjects = projectItems.filter((item) => item.conversionRate === null);
  const eligibleTimeEntries = timeEntries.filter((entry) => entry.clientId === form.clientId && selectedProjectIds.includes(entry.projectId || ""));
  const selectedTimeItems = eligibleTimeEntries.filter((entry) => selectedTimeIds.includes(entry.id)).map((entry) => ({
    description: entry.description?.trim() || "Timesheet",
    quantity: (entry.durationMinutes || 0) / 60,
    unitPrice: Number(entry.hourlyRate || 0),
    sourceId: entry.id,
  }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      toast.error("Pilih klien dulu");
      return;
    }
    const validItems = [...items.filter((item) => item.description.trim()), ...selectedTimeItems];
    if (missingRateProjects.length) { toast.error("Lengkapi kurs workspace sebelum membuat invoice"); return; }
    if (mode === "create" && validItems.length === 0 && projectItems.length === 0) {
      toast.error("Tambahkan minimal satu item tagihan");
      return;
    }
    setLoading(true);
    try {
      const data = {
        clientId: form.clientId,
        projectId: selectedProjectIds.length === 1 ? selectedProjectIds[0] : undefined,
        projectIds: selectedProjectIds,
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        items: mode === "create" ? validItems : undefined,
      };

      if (mode === "create") {
        const invoice = await createInvoice(data);
        if (!invoice?.id) {
          throw new Error("Invoice dibuat tapi ID tidak diterima. Coba refresh daftar invoice.");
        }
        toast.success("Invoice dibuat");
        // Hard navigate so mobile always leaves the form even if soft router stalls.
        window.location.assign(`/app/invoices/${invoice.id}`);
        return;
      }

      if (defaultValues?.id) {
        await updateInvoice(defaultValues.id, data);
        toast.success("Invoice diperbarui");
        onSuccess?.();
        router.refresh();
      }
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err && "message" in err
            ? String((err as { message: unknown }).message)
            : "Terjadi kesalahan";
      // Next.js often wraps server action failures; surface something readable.
      toast.error(msg && msg !== "An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error."
        ? msg
        : "Gagal membuat invoice. Coba lagi.");
      setLoading(false);
    }
  }

  function set(k: keyof typeof form, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function applyTemplate(templateId: string) {
    const tpl = templates?.find((t) => t.id === templateId);
    if (!tpl) return;
    setForm((prev) => ({
      ...prev,
      currency: tpl.defaultCurrency || prev.currency,
      notes: tpl.notes || prev.notes,
      terms: tpl.terms || prev.terms,
    }));
    toast.success(`Template "${tpl.name}" diterapkan`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {templates && templates.length > 0 && mode === "create" && (
        <div className="space-y-2">
          <Label>Apply Template (opsional)</Label>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Pilih template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.defaultCurrency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="clientId">Klien *</Label>
        <Select
          value={form.clientId}
          onValueChange={(v) => { setSelectedTimeIds([]); setSelectedProjectIds([]); setForm((prev) => ({ ...prev, clientId: v, projectId: "" })); }}
          disabled={mode === "edit"}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder="Pilih klien" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.companyName || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {clientProjects.length > 0 && mode === "create" && (
        <div className="space-y-2">
          <Label>Proyek (bisa pilih beberapa)</Label>
          <div className="space-y-2 rounded-lg border p-2">
            {clientProjects.map((project) => {
              const selected = selectedProjectIds.includes(project.id);
              return (
                <label key={project.id} className="flex cursor-pointer items-center gap-3 rounded-md p-2 hover:bg-muted/60">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={(event) => {
                      setSelectedTimeIds([]);
                      setSelectedProjectIds((prev) => event.target.checked ? [...prev, project.id] : prev.filter((id) => id !== project.id));
                    }}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">{project.name}</span>
                  <span className="text-xs text-muted-foreground">{project.currency}</span>
                </label>
              );
            })}
          </div>
          {missingRateProjects.length > 0 && (
            <p className="text-xs text-destructive">Kurs belum tersedia untuk {Array.from(new Set(missingRateProjects.map((item) => item.originalCurrency))).join(", ")}. <a className="underline" href="/app/settings?tab=currency">Atur Kurs</a></p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">Tanggal Terbit *</Label>
          <Input
            id="issueDate"
            type="date"
            value={form.issueDate}
            onChange={(e) => {
              const issueDate = e.target.value;
              setForm((prev) => ({ ...prev, issueDate, dueDate: dueDateTouched ? prev.dueDate : addDaysToIsoDate(issueDate, 14) }));
            }}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Jatuh Tempo</Label>
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => { setDueDateTouched(true); set("dueDate", e.target.value); }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">Mata Uang</Label>
        <Select value={form.currency} onValueChange={(v) => set("currency", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="IDR">IDR - Indonesian Rupiah</SelectItem>
            <SelectItem value="USD">USD - US Dollar</SelectItem>
            <SelectItem value="EUR">EUR - Euro</SelectItem>
            <SelectItem value="GBP">GBP - British Pound</SelectItem>
            <SelectItem value="SGD">SGD - Singapore Dollar</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {mode === "create" && (
        <div className="space-y-3 rounded-lg border p-3">
          <div className="flex items-center justify-between"><Label>Item tagihan *</Label><Button type="button" size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}>+ Item</Button></div>
          {projectItems.map((item) => (
            <div key={item.projectId} className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex justify-between gap-3"><span className="font-medium">{item.description}</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: form.currency }).format(item.unitPrice)}</span></div>
              {item.originalCurrency !== form.currency && item.conversionRate !== null && <p className="mt-1 text-xs text-muted-foreground">{item.originalCurrency} {item.originalAmount.toLocaleString("id-ID")} × {item.conversionRate.toLocaleString("id-ID")}</p>}
            </div>
          ))}
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_64px_100px_36px] gap-2">
              <Input aria-label={`Deskripsi item ${index + 1}`} placeholder="Deskripsi" value={item.description} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} />
              <Input aria-label={`Jumlah item ${index + 1}`} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} />
              <Input aria-label={`Harga item ${index + 1}`} type="number" min="0" step="1" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, unitPrice: Number(e.target.value) } : row))} />
              <Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>×</Button>
            </div>
          ))}
          {eligibleTimeEntries.length > 0 && (
            <div className="space-y-2 border-t pt-3">
              <Label>Import timesheet</Label>
              {eligibleTimeEntries.map((entry) => {
                const hours = (entry.durationMinutes || 0) / 60;
                return <label key={entry.id} className="flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm">
                  <input type="checkbox" checked={selectedTimeIds.includes(entry.id)} onChange={(e) => setSelectedTimeIds((prev) => e.target.checked ? [...prev, entry.id] : prev.filter((id) => id !== entry.id))} />
                  <span className="min-w-0 flex-1 truncate">{entry.description || "Timesheet"}</span>
                  <span className="text-muted-foreground">{hours.toFixed(2)} jam</span>
                </label>;
              })}
            </div>
          )}
          <div className="flex justify-between border-t pt-3 text-sm font-semibold"><span>Subtotal</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: form.currency, maximumFractionDigits: form.currency === "IDR" ? 0 : 2 }).format(calculateDraftItemsSubtotal([...projectItems, ...items, ...selectedTimeItems]))}</span></div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">Catatan</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Catatan yang tampil di invoice..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">Syarat</Label>
        <Input
          id="terms"
          value={form.terms}
          onChange={(e) => set("terms", e.target.value)}
          placeholder="contoh: Net 30, jatuh tempo dalam 14 hari..."
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? mode === "create"
            ? "Membuat invoice…"
            : "Menyimpan…"
          : mode === "create"
            ? "Buat Invoice"
            : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
