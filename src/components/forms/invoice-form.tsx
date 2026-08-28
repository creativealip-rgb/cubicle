"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { createInvoice, updateInvoice } from "@/lib/actions/invoices";
import { addDaysToIsoDate, calculateDraftItemsSubtotal } from "@/lib/invoice-create-form";
import { buildRateMap } from "@/lib/currency-base";
import { convertCurrency, resolveProjectAmount } from "@/lib/invoice-project-items";
import { resolveFixedSourceAmount } from "@/lib/project-invoice-sources";
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
    invoiceNumber?: string;
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
  const { refresh } = useAppTransition();
  const { t, lang } = useT();
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
    invoiceNumber: defaultValues?.invoiceNumber ?? "",
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
  const projectItems = selectedProjects.filter((project) => ["fixed_price", "project", "package", "hourly", "hours", "retainer"].includes(project.billingType)).map((project) => {
    const originalAmount = resolveProjectAmount({ billingType: project.billingType, budget: project.budget ? Number(project.budget) : null, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null });
    const source = projectSources[project.id] ?? defaultInvoiceSource(project.billingType, { hasActiveFixedHistory: Boolean(project.priorActiveFixedBilledAmount), hasInitialTimeEntries: Boolean(project.initialTimeEntryIds?.length) });
    // Compute preview amount from source mode for all billing types
    let previewAmount: number | string = originalAmount;
    if (source) {
      if (source.mode === "hourly_deposit") {
        previewAmount = source.amount ?? source.value ?? 0;
      } else if (source.mode === "hourly_timesheet") {
        previewAmount = eligibleTimeEntriesInPeriod(project.eligibleTimeEntries, source.periodStart, source.periodEnd).totalAmount;
      } else if (["fixed_dp", "fixed_milestone"].includes(source.mode) && source.amountType && source.value) {
        previewAmount = resolveFixedSourceAmount(
          { mode: source.mode as "fixed_dp" | "fixed_milestone", amountType: source.amountType, value: source.value },
          { agreedAmount: originalAmount, priorActiveOriginalAmounts: [] }
        );
      } else if (source.mode === "fixed_full") {
        previewAmount = originalAmount;
      } else if (source.mode === "fixed_final") {
        // Pelunasan sisa = agreed - previously invoiced
        previewAmount = Math.max(0, originalAmount - (project.priorActiveFixedBilledAmount || 0));
      }
    }
    const numericPreview = Number(previewAmount);
    const converted = convertCurrency(numericPreview, project.currency, form.currency, baseCurrency, rateMap);
    return { description: project.name, quantity: 1, unitPrice: converted?.amount ?? 0, projectId: project.id, originalAmount: numericPreview, originalCurrency: project.currency, conversionRate: converted?.rate ?? null };
  });
  const missingRateProjects = projectItems.filter((item) => item.conversionRate === null);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.clientId) {
      toast.error(t("Pilih klien dulu", "Please select a client first"));
      return;
    }
    const validItems = items.filter((item) => item.description.trim());
    const sourcePayload = selectedProjects.map((project) => {
      const source = projectSources[project.id] ?? defaultInvoiceSource(project.billingType, { hasActiveFixedHistory: Boolean(project.priorActiveFixedBilledAmount), hasInitialTimeEntries: Boolean(project.initialTimeEntryIds?.length) });
      if (source?.mode === "hourly_timesheet") {
        const period = eligibleTimeEntriesInPeriod(project.eligibleTimeEntries, source.periodStart, source.periodEnd);
        return { project, source: { ...source, timeEntryIds: period.entries.map((entry) => entry.id) } };
      }
      return { project, source };
    });
    if (missingRateProjects.length) { toast.error(t("Lengkapi kurs workspace sebelum membuat invoice", "Complete workspace exchange rates before creating an invoice")); return; }
    if (selectedProjects.length > 0 && sourcePayload.some(({ source }) => !sourceDraftComplete(source))) { toast.error(t("Lengkapi sumber tagihan setiap proyek", "Complete billing sources for every project")); return; }
    if (mode === "create" && validItems.length === 0 && sourcePayload.length === 0) {
      toast.error(t("Tambahkan minimal satu item tagihan", "Add at least one invoice item"));
      return;
    }
    setLoading(true);
    try {
      const data: any = {
        clientId: form.clientId,
        projectId: selectedProjectIds.length === 1 ? selectedProjectIds[0] : undefined,
        projectIds: selectedProjectIds,
        projectSources: sourcePayload.flatMap(({ project, source }) => {
          if (!source) return [];
          const amountVal = source.mode === "hourly_deposit" ? (source.amount ?? source.value) : undefined;
          const raw = {
            projectId: project.id,
            ...source,
            ...(source.mode === "hourly_deposit" && amountVal ? { amount: amountVal } : {}),
            ...(source.mode === "hourly_timesheet" ? { timeEntryIds: source.timeEntryIds?.length ? source.timeEntryIds : project.initialTimeEntryIds ?? [] } : {})
          };
          const clean: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(raw)) {
            if (v !== undefined && v !== null && v !== "") clean[k] = v;
          }
          const parsed = ProjectInvoiceSourceSchema.safeParse(clean);
          return parsed.success ? [parsed.data] : [];
        }),
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        currency: form.currency,
        notes: form.notes || undefined,
        terms: form.terms || undefined,
        scopedProjectId,
        items: mode === "create" ? validItems : undefined,
      };

      if (mode === "create") {
        const invoice = await createInvoice(data);
        if ("error" in invoice) {
          toast.error(invoice.error);
          setLoading(false);
          return;
        }
        if (!invoice?.id) {
          throw new Error("Invoice dibuat tapi ID tidak diterima. Coba refresh daftar invoice.");
        }
        toast.success(t("Invoice dibuat", "Invoice created"));
        setLoading(false);
        if (onSuccess) onSuccess();
        else window.location.assign(buildInvoiceDetailUrl(invoice.id, { type: "global" }));
        return;
      }

      if (defaultValues?.id) {
        await updateInvoice(defaultValues.id, data);
        toast.success(t("Invoice diperbarui", "Invoice updated"));
        onSuccess?.();
        refresh();
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
              <SelectValue placeholder={t("Pilih template...", "Select template...")} />
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
        <Label htmlFor="clientId">{t("Klien", "Client")} *</Label>
        <Select
          value={form.clientId}
          onValueChange={(v) => { setSelectedProjectIds([]); setProjectSources({}); setForm((prev) => ({ ...prev, clientId: v, projectId: "" })); }}
          disabled={mode === "edit"}
          required
        >
          <SelectTrigger>
            <SelectValue placeholder={t("Pilih klien", "Select client")} />
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
          <Label>{t("Proyek (bisa pilih beberapa)", "Projects (you can select multiple)")}</Label>
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
        return <div key={project.id} className="space-y-3 rounded-lg border p-3">
          <div><p className="font-medium">{project.name}</p><p className="text-xs text-muted-foreground">{t("Pilih sumber tagihan", "Select billing source")}</p></div>
          <Select value={source?.mode ?? ""} onValueChange={(value) => updateSource(project.id, { mode: value as InvoiceSourceMode, amountType: undefined, value: undefined, milestoneName: undefined, description: undefined, periodStart: undefined, periodEnd: undefined, timeEntryIds: undefined })}>
            <SelectTrigger><SelectValue placeholder={t("Pilih sumber", "Select source")} /></SelectTrigger>
            <SelectContent>
              {["hourly", "hours"].includes(project.billingType) ? (
                <>
                  <SelectItem value="hourly_deposit">{t("Deposit / Down Payment", "Deposit / Down Payment")}</SelectItem>
                  <SelectItem value="hourly_timesheet">{t("Log Jam Kerja (Timesheet)", "Time Entries (Timesheet)")}</SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="fixed_full">{t("Nilai penuh", "Full amount")}</SelectItem>
                  <SelectItem value="fixed_dp">{t("DP", "Down payment")}</SelectItem>
                  <SelectItem value="fixed_milestone">{t("Milestone", "Milestone")}</SelectItem>
                  <SelectItem value="fixed_final">{t("Pelunasan sisa", "Remaining balance")}</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {["hourly", "hours"].includes(project.billingType) ? (
            source?.mode === "hourly_deposit" ? (
              <div className="space-y-2">
                <Input
                  placeholder={t("Keterangan deposit (opsional)", "Deposit description (optional)")}
                  value={source.description ?? ""}
                  onChange={(e) => updateSource(project.id, { description: e.target.value })}
                />
                <Input
                  type="number"
                  min="1"
                  step="1"
                  placeholder={t("Nominal deposit", "Deposit amount")}
                  value={source.value ?? source.amount ?? ""}
                  onChange={(e) => updateSource(project.id, { value: Number(e.target.value), amount: Number(e.target.value) })}
                />
              </div>
            ) : source?.mode === "hourly_timesheet" ? (
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>{t("Semua log jam kerja yang belum ditagih untuk proyek ini akan otomatis ditagihkan.", "All unbilled time entries for this project will be billed automatically.")}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("Periode Mulai", "Period Start")}</Label>
                    <Input
                      type="date"
                      value={source.periodStart ?? ""}
                      onChange={(e) => {
                        const periodStart = e.target.value;
                        updateSource(project.id, {
                          periodStart,
                          ...(source?.periodEnd && source.periodEnd <= periodStart
                            ? { periodEnd: addDaysToIsoDate(periodStart, 1) }
                            : {}),
                        });
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("Periode Selesai", "Period End")}</Label>
                    <Input
                      type="date"
                      value={source.periodEnd ?? ""}
                      onChange={(e) => {
                        const periodEnd = e.target.value;
                        updateSource(project.id, {
                          periodEnd: source?.periodStart && periodEnd <= source.periodStart
                            ? addDaysToIsoDate(periodEnd, 1)
                            : periodEnd,
                        });
                      }}
                    />
                  </div>
                </div>
              </div>
            ) : null
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 rounded-md bg-muted/40 p-2 text-xs"><span>{t("Nilai disepakati", "Agreed value")}<br/><b>{fixedPreview.agreedAmount.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</b></span><span>{t("Sudah ditagih", "Already invoiced")}<br/><b>{fixedPreview.previouslyInvoiced.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</b></span><span>{t("Sisa nilai", "Remaining value")}<br/><b>{fixedPreview.remainingAmount.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</b></span></div>
              {(source?.mode === "fixed_dp" || source?.mode === "fixed_milestone") && <div className="grid gap-2 sm:grid-cols-2">
                {source.mode === "fixed_milestone" && <Input placeholder={t("Nama milestone", "Milestone name")} value={source.milestoneName ?? ""} onChange={(e) => updateSource(project.id, { milestoneName: e.target.value })} />}
                <Select value={source.amountType} onValueChange={(value) => updateSource(project.id, { amountType: value as "percent" | "amount" })}><SelectTrigger><SelectValue placeholder={t("Jenis nilai", "Value type")} /></SelectTrigger><SelectContent><SelectItem value="percent">{t("Persen", "Percent")}</SelectItem><SelectItem value="amount">{t("Nominal", "Amount")}</SelectItem></SelectContent></Select>
                <Input type="number" min="0.01" step="0.01" placeholder={source.amountType === "percent" ? t("Persen", "Percent") : t("Nominal", "Amount")} value={source.value ?? ""} onChange={(e) => updateSource(project.id, { value: Number(e.target.value) })} />
              </div>}
            </>
          )}
        </div>;
      })}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="issueDate">{t("Tanggal Terbit *", "Issue Date *")}</Label>
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
          <Label htmlFor="dueDate">{t("Jatuh Tempo", "Due Date")}</Label>
          <Input
            id="dueDate"
            type="date"
            value={form.dueDate}
            onChange={(e) => { setDueDateTouched(true); set("dueDate", e.target.value); }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="invoiceNumber">{t("Nomor Invoice", "Invoice Number")}</Label>
        <Input
          id="invoiceNumber"
          value={form.invoiceNumber}
          onChange={(e) => set("invoiceNumber", e.target.value)}
          placeholder={t("Kosongkan untuk nomor otomatis", "Leave blank for automatic number")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="currency">{t("Mata Uang", "Currency")}</Label>
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
          <div className="flex items-center justify-between"><Label>{t("Item tagihan *", "Invoice items *")}</Label><Button type="button" size="sm" variant="outline" onClick={() => setItems((prev) => [...prev, { description: "", quantity: 1, unitPrice: 0 }])}>+ {t("Item", "Item")}</Button></div>
          {projectItems.map((item) => (
            <div key={item.projectId} className="rounded-md border bg-muted/20 p-3 text-sm">
              <div className="flex justify-between gap-3"><span className="font-medium">{item.description}</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: form.currency }).format(item.unitPrice)}</span></div>
              {item.originalCurrency !== form.currency && item.conversionRate !== null && <p className="mt-1 text-xs text-muted-foreground">{item.originalCurrency} {item.originalAmount.toLocaleString("id-ID")} × {item.conversionRate.toLocaleString("id-ID")}</p>}
            </div>
          ))}
          {items.map((item, index) => (
            <div key={index} className="grid grid-cols-[minmax(0,1fr)_64px_100px_36px] gap-2">
              <Input aria-label={t(`Deskripsi item ${index + 1}`, `Item ${index + 1} description`)} placeholder={t("Deskripsi", "Description")} value={item.description} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, description: e.target.value } : row))} />
              <Input aria-label={t(`Jumlah item ${index + 1}`, `Item ${index + 1} quantity`)} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row))} />
              <Input aria-label={t(`Harga item ${index + 1}`, `Item ${index + 1} price`)} type="number" min="0" step="1" value={item.unitPrice} onChange={(e) => setItems((prev) => prev.map((row, i) => i === index ? { ...row, unitPrice: Number(e.target.value) } : row))} />
              <Button type="button" variant="ghost" size="icon" disabled={items.length === 1} onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}>×</Button>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3 text-sm font-semibold"><span>Subtotal</span><span>{new Intl.NumberFormat("id-ID", { style: "currency", currency: form.currency, maximumFractionDigits: form.currency === "IDR" ? 0 : 2 }).format(calculateDraftItemsSubtotal([...projectItems, ...items]))}</span></div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="notes">{t("Catatan", "Notes")}</Label>
        <Textarea
          id="notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder={t("Catatan yang tampil di invoice...", "Notes shown on the invoice...")}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="terms">{t("Syarat", "Terms")}</Label>
        <Input
          id="terms"
          value={form.terms}
          onChange={(e) => set("terms", e.target.value)}
          placeholder={t("contoh: Net 30, jatuh tempo dalam 14 hari...", "e.g. Net 30, due within 14 days...")}
        />
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading
          ? mode === "create"
            ? t("Membuat invoice…", "Creating invoice…")
            : t("Menyimpan…", "Saving…")
          : mode === "create"
            ? t("Buat Invoice", "Create Invoice")
            : t("Simpan Perubahan", "Save Changes")}
      </Button>
    </form>
  );
}
