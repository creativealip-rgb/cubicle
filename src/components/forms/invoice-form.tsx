"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { addDaysToIsoDate, calculateDraftItemsSubtotal } from "@/lib/invoice-create-form";
import { buildRateMap } from "@/lib/currency-base";
import { convertCurrency, resolveProjectAmount } from "@/lib/invoice-project-items";
import { defaultInvoiceSource, eligibleTimeEntriesInPeriod, fixedSourcePreview, sourceDraftComplete, type EligibleInvoiceTimeEntry, type InvoiceSourceDraft, type InvoiceSourceMode } from "@/lib/invoice-source-ui";
import { ProjectInvoiceSourceSchema } from "@/lib/project-invoice-sources";
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
  initialTimeEntryIds?: string[];
  agreedAmount: number;
  priorActiveFixedBilledAmount: number;
  eligibleTimeEntries: EligibleInvoiceTimeEntry[];
}

interface TemplateOption {
  id: string;
  name: string;
  defaultCurrency: string | null;
  defaultTaxRate: string | null;
  notes: string | null;
  terms: string | null;
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

  baseCurrency?: string;
  currencyRates?: Array<{ fromCurrency: string; rate: string }>;
  initialItems?: Array<{ description: string; quantity: number; unitPrice: number; sourceId?: string }>;
  onSuccess?: () => void;
  scopedClientId?: string;
  scopedProjectId?: string;
}

export function InvoiceForm({ mode, defaultValues, clients, projects, templates, baseCurrency = "IDR", currencyRates = [], initialItems = [], onSuccess, scopedClientId, scopedProjectId }: InvoiceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const startsSourceBacked = Boolean(scopedProjectId || defaultValues?.projectId || initialItems.some((item) => item.sourceId));
  const [items, setItems] = useState(initialItems.length ? initialItems : startsSourceBacked ? [] : [{ description: "", quantity: 1, unitPrice: 0 }]);
  const [projectSources, setProjectSources] = useState<Record<string, InvoiceSourceDraft>>({});
  const [dueDateTouched, setDueDateTouched] = useState(Boolean(defaultValues?.dueDate));

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(scopedProjectId ? [scopedProjectId] : defaultValues?.projectId ? [defaultValues.projectId] : []);
  const [form, setForm] = useState({
    clientId: scopedClientId ?? defaultValues?.clientId ?? "",
    projectId: "",
    issueDate: defaultValues?.issueDate ?? new Date().toISOString().split("T")[0],
    dueDate: defaultValues?.dueDate ?? addDaysToIsoDate(defaultValues?.issueDate ?? new Date().toISOString().split("T")[0], 14),
    currency: defaultValues?.currency ?? baseCurrency,
    notes: defaultValues?.notes ?? "",
    terms: defaultValues?.terms ?? "",
  });

  // Filter projects by selected client.
  const clientProjects = projects?.filter(p => p.clientId === form.clientId) ?? [];
  const rateMap = buildRateMap(currencyRates);
  const selectedProjects = clientProjects.filter((project) => selectedProjectIds.includes(project.id));
  function updateSource(projectId: string, next: Partial<InvoiceSourceDraft> & { mode?: InvoiceSourceMode }) {
    setProjectSources((current) => {
      const project = clientProjects.find((candidate) => candidate.id === projectId);
      const existing = current[projectId] ?? defaultInvoiceSource(project?.billingType ?? "", { hasActiveFixedHistory: Boolean(project?.priorActiveFixedBilledAmount), hasInitialTimeEntries: Boolean(project?.initialTimeEntryIds?.length) }) ?? { mode: "fixed_final" };
      return { ...current, [projectId]: { ...existing, ...next } };
    });
  }
  const projectItems = selectedProjects.map((project) => {
    const originalAmount = resolveProjectAmount({ billingType: project.billingType, budget: project.budget ? Number(project.budget) : null, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null });
    const converted = convertCurrency(originalAmount, project.currency, form.currency, baseCurrency, rateMap);
    return { description: project.name, quantity: 1, unitPrice: converted?.amount ?? 0, projectId: project.id, originalAmount, originalCurrency: project.currency, conversionRate: converted?.rate ?? null };
  });
  const missingRateProjects = projectItems.filter((item) => item.conversionRate === null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      toast.error("Pilih klien dulu");
      return;
    }
    const validItems = items.filter((item) => item.description.trim());
    if (missingRateProjects.length) { toast.error("Lengkapi kurs workspace sebelum membuat invoice"); return; }
    const sourcePayload = selectedProjects.map((project) => ({ project, source: projectSources[project.id] ?? defaultInvoiceSource(project.billingType, { hasActiveFixedHistory: Boolean(project.priorActiveFixedBilledAmount), hasInitialTimeEntries: Boolean(project.initialTimeEntryIds?.length) }) }));
    if (sourcePayload.some(({ source }) => !sourceDraftComplete(source))) { toast.error("Lengkapi sumber tagihan setiap proyek"); return; }
    if (mode === "create" && validItems.length === 0 && sourcePayload.length === 0) {
      toast.error("Tambahkan minimal satu item tagihan");
      return;
    }
    setLoading(true);
    try {
      const data = {
        clientId: form.clientId,
        projectId: selectedProjectIds.length === 1 ? selectedProjectIds[0] : undefined,
        projectIds: selectedProjectIds,
        projectSources: sourcePayload.map(({ project, source }) => ProjectInvoiceSourceSchema.parse({ projectId: project.id, ...source!, ...(source?.mode === "hourly_timesheet" ? { timeEntryIds: source.timeEntryIds?.length ? source.timeEntryIds : project.initialTimeEntryIds ?? [] } : {}) })),
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        scopedProjectId,
        items: mode === "create" ? validItems : undefined,
      };

      if (mode === "create") {
        const invoice = await createInvoice(data);
        if (!invoice?.id) {
          throw new Error("Invoice dibuat tapi ID tidak diterima. Coba refresh daftar invoice.");
        }
        toast.success("Invoice dibuat");
        if (onSuccess) onSuccess();
        else window.location.assign(buildInvoiceDetailUrl(invoice.id, { type: "global" }));
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

      {!scopedClientId && <div className="space-y-2">
        <Label htmlFor="clientId">Klien *</Label>
        <Select
          value={form.clientId}
          onValueChange={(v) => { setSelectedProjectIds([]); setProjectSources({}); setForm((prev) => ({ ...prev, clientId: v, projectId: "" })); }}
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
      </div>}

      {!scopedProjectId && clientProjects.length > 0 && mode === "create" && (
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

      {mode === "create" && selectedProjects.map((project) => {
        const source = projectSources[project.id] ?? defaultInvoiceSource(project.billingType, { hasActiveFixedHistory: Boolean(project.priorActiveFixedBilledAmount), hasInitialTimeEntries: Boolean(project.initialTimeEntryIds?.length) });
        const fixedPreview = fixedSourcePreview(project.agreedAmount, project.priorActiveFixedBilledAmount);
        const periodEntries = eligibleTimeEntriesInPeriod(project.eligibleTimeEntries, source?.periodStart, source?.periodEnd);
        const selectedEntries = periodEntries.entries.filter((entry) => source?.timeEntryIds?.includes(entry.id));
        const selectedTotal = selectedEntries.reduce((sum, entry) => sum + entry.durationMinutes / 60 * entry.hourlyRate, 0);
        const isFixed = ["fixed_price", "project", "package"].includes(project.billingType);
        const isHourly = ["hourly", "hours"].includes(project.billingType);
        if (!isFixed && !isHourly) return <div key={project.id} className="rounded-lg border p-3 text-sm"><p className="font-medium">{project.name}</p><p className="text-muted-foreground">Invoice periode Retainer dibuat lewat alur periode Retainer. Gunakan item manual untuk deposit.</p></div>;
        return <div key={project.id} className="space-y-3 rounded-lg border p-3">
          <div><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">Pilih sumber tagihan</p></div>
          <Select value={source?.mode ?? ""} onValueChange={(value) => updateSource(project.id, { mode: value as InvoiceSourceMode, amountType: undefined, value: undefined, milestoneName: undefined, description: undefined, periodStart: undefined, periodEnd: undefined, timeEntryIds: value === "hourly_timesheet" ? project.initialTimeEntryIds ?? [] : undefined })}>
            <SelectTrigger><SelectValue placeholder="Pilih sumber" /></SelectTrigger>
            <SelectContent>
              {isFixed && <><SelectItem value="fixed_full">Nilai penuh</SelectItem><SelectItem value="fixed_dp">DP</SelectItem><SelectItem value="fixed_milestone">Milestone</SelectItem><SelectItem value="fixed_final">Pelunasan sisa</SelectItem></>}
              {isHourly && <><SelectItem value="hourly_timesheet">Timesheet disetujui</SelectItem><SelectItem value="hourly_deposit">Deposit</SelectItem></>}
            </SelectContent>
          </Select>
          {isFixed && <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-xs"><span>Nilai disepakati<br/><b>{fixedPreview.agreedAmount.toLocaleString("id-ID")}</b></span><span>Sudah ditagih<br/><b>{fixedPreview.previouslyInvoiced.toLocaleString("id-ID")}</b></span><span>Sisa nilai<br/><b>{fixedPreview.remainingAmount.toLocaleString("id-ID")}</b></span></div>}
          {(source?.mode === "fixed_dp" || source?.mode === "fixed_milestone") && <div className="grid gap-2 sm:grid-cols-2">
            {source.mode === "fixed_milestone" && <Input placeholder="Nama milestone" value={source.milestoneName ?? ""} onChange={(e) => updateSource(project.id, { milestoneName: e.target.value })} />}
            <Select value={source.amountType} onValueChange={(value) => updateSource(project.id, { amountType: value as "percent" | "amount" })}><SelectTrigger><SelectValue placeholder="Jenis nilai" /></SelectTrigger><SelectContent><SelectItem value="percent">Persen</SelectItem><SelectItem value="amount">Nominal</SelectItem></SelectContent></Select>
            <Input type="number" min="0.01" step="0.01" placeholder={source.amountType === "percent" ? "Persen" : "Nominal"} value={source.value ?? ""} onChange={(e) => updateSource(project.id, { value: Number(e.target.value) })} />
          </div>}
          {source?.mode === "hourly_deposit" && <div className="grid gap-2 sm:grid-cols-2"><Input placeholder="Deskripsi deposit" value={source.description ?? ""} onChange={(e) => updateSource(project.id, { description: e.target.value })} /><Input type="number" min="0.01" placeholder="Nominal deposit" value={source.value ?? ""} onChange={(e) => updateSource(project.id, { value: Number(e.target.value) })} /></div>}
          {source?.mode === "hourly_timesheet" && <div className="grid gap-2 sm:grid-cols-2"><Input aria-label="Awal periode" type="date" value={source.periodStart ?? ""} onChange={(e) => updateSource(project.id, { periodStart: e.target.value, timeEntryIds: [] })} /><Input aria-label="Akhir periode" type="date" value={source.periodEnd ?? ""} onChange={(e) => updateSource(project.id, { periodEnd: e.target.value, timeEntryIds: [] })} /><div className="space-y-1 sm:col-span-2">{periodEntries.entries.map((entry) => <label key={entry.id} className="flex items-center gap-2 rounded border p-2 text-sm"><input type="checkbox" checked={source.timeEntryIds?.includes(entry.id) ?? false} onChange={(event) => updateSource(project.id, { timeEntryIds: event.target.checked ? [...(source.timeEntryIds ?? []), entry.id] : (source.timeEntryIds ?? []).filter((id) => id !== entry.id) })}/><span className="flex-1">{entry.workDate} · {entry.description || "Waktu proyek"}</span><span>{entry.durationMinutes} menit</span></label>)}<p className="text-xs text-muted-foreground">Total terpilih: {selectedEntries.reduce((sum, entry) => sum + entry.durationMinutes, 0)} menit · {selectedTotal.toLocaleString("id-ID")}</p></div></div>}
        </div>;
      })}

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
          <div className="flex justify-between border-t pt-3 text-sm font-semibold"><span>Subtotal</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: form.currency, maximumFractionDigits: form.currency === "IDR" ? 0 : 2 }).format(calculateDraftItemsSubtotal([...projectItems, ...items]))}</span></div>
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
