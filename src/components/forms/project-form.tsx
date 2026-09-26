"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject, updateProject } from "@/lib/actions/projects";
import { createClient } from "@/lib/actions/clients";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";
import { useAppTransition } from "@/lib/transition-provider";
import { AlertCircle, ChevronDown, Plus } from "lucide-react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";

type BillingModel = "fixed_price" | "hourly" | "retainer";
type Defaults = {
  id?: string;
  name?: string;
  description?: string;
  clientId?: string;
  status?: string;
  billingModel?: BillingModel;
  billingType?: string;
  timeTrackingMode?: "off" | "internal" | "billable";
  currency?: string;
  rate?: string;
  budget?: string;
  retainerFee?: string;
  retainerIncludedMinutes?: number;
  retainerResetDay?: number;
  retainerOveragePolicy?: "none" | "warn" | "bill";
  retainerOverageRate?: string;
  startDate?: string;
  finishDate?: string;
  dueDate?: string;
  clientVisible?: boolean;
  selectedPackageId?: string | null;
  serviceIds?: string[];
  [legacy: string]: unknown;
};

export function ProjectForm({
  mode,
  clientId,
  clients = [],
  defaultValues,
  billingModelLocked = false,
  section = "all",
  onSuccess,
}: {
  mode: "create" | "edit";
  clientId?: string;
  clients?: Array<{ id: string; name: string }>;
  defaultValues?: Defaults;
  billingModelLocked?: boolean;
  section?: "all" | "general" | "billing";
  onSuccess?: (id?: string) => void;
}) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);
  const [missingBillingConfig, setMissingBillingConfig] = useState(false);

  const [clientSearch, setClientSearch] = useState(() => {
    const selected = clients.find((c) => c.id === (defaultValues?.clientId ?? clientId ?? ""));
    return selected?.name ?? "";
  });
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [availableClients, setAvailableClients] = useState(clients);
  const [quickClientMode, setQuickClientMode] = useState(false);
  const [quickClientName, setQuickClientName] = useState("");
  const [quickClientLoading, setQuickClientLoading] = useState(false);

  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return availableClients;
    return availableClients.filter((c) => c.name.toLowerCase().includes(term));
  }, [availableClients, clientSearch]);

  async function createQuickClient() {
    const name = quickClientName.trim();
    if (!name || quickClientLoading) return;
    setQuickClientLoading(true);
    try {
      const result = await createClient({ name, tags: [] });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const next = { id: result.client.id, name: result.client.name };
      setAvailableClients((current) => [...current, next]);
      setForm((current) => ({ ...current, clientId: next.id }));
      setClientSearch(next.name);
      setQuickClientName("");
      setQuickClientMode(false);
      setClientSearchOpen(false);
      toast.success(t("Klien dibuat dan dipilih", "Client created and selected"));
    } finally {
      setQuickClientLoading(false);
    }
  }

  const fallback: BillingModel =
    defaultValues?.billingModel ??
    (defaultValues?.billingType === "hours" || defaultValues?.billingType === "hourly"
      ? "hourly"
      : "fixed_price");

  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    clientId: defaultValues?.clientId ?? clientId ?? "",
    status: defaultValues?.status ?? "active",
    billingModel: defaultValues?.billingModel ?? fallback,
    timeTrackingMode: defaultValues?.timeTrackingMode ?? (fallback === "fixed_price" ? "off" : "billable"),
    currency: defaultValues?.currency ?? "IDR",
    rate: defaultValues?.rate ?? "",
    budget: defaultValues?.budget ?? "",
    retainerFee: defaultValues?.retainerFee ?? "",
    retainerIncludedMinutes: String(defaultValues?.retainerIncludedMinutes ?? ""),
    retainerResetDay: String(defaultValues?.retainerResetDay ?? 1),
    retainerOveragePolicy: defaultValues?.retainerOveragePolicy ?? "none",
    retainerOverageRate: defaultValues?.retainerOverageRate ?? "",
    startDate: defaultValues?.startDate ?? "",
    finishDate: defaultValues?.finishDate ?? "",
    dueDate: defaultValues?.dueDate ?? "",
    clientVisible: defaultValues?.clientVisible ?? (mode === "create" ? true : Boolean(clientId)),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMissingBillingConfig(false);

    try {
      const data = {
        ...form,
        clientId: form.clientId || undefined,
        billingModel: form.billingModel as BillingModel,
        timeTrackingMode: form.timeTrackingMode,
        rate: form.rate ? Number(form.rate) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        retainerFee: form.retainerFee ? Number(form.retainerFee) : undefined,
        retainerIncludedMinutes: form.retainerIncludedMinutes ? Number(form.retainerIncludedMinutes) : undefined,
        retainerResetDay: form.retainerResetDay ? Number(form.retainerResetDay) : undefined,
        retainerOveragePolicy: form.retainerOveragePolicy as "none" | "warn" | "bill",
        retainerOverageRate: form.retainerOverageRate ? Number(form.retainerOverageRate) : undefined,
        status: form.status as "draft" | "active" | "on_hold" | "completed" | "cancelled" | "archived",
        clientVisible: form.clientVisible,
      };

      if (form.billingModel === "hourly" && (!form.rate || Number(form.rate) <= 0)) {
        setMissingBillingConfig(true);
        setLoading(false);
        return;
      }

      if (mode === "create") {
        const result = await createProject(data);
        if (!result.ok) {
          throw new Error(
            result.code === "CURRENCY_NOT_CONFIGURED"
              ? t(`Currency ${data.currency} belum dikonfigurasi. Atur currency workspace terlebih dahulu.`, `Currency ${data.currency} is not configured. Configure it in workspace settings first.`)
              : (result as { error?: string }).error ?? t("Gagal menyimpan", "Failed to save"),
          );
        }
        toast.success(t("Project dibuat", "Project created"));
        onSuccess?.(result.project.id);
        router.push(`/app/projects/${result.project.id}`);
        return;
      } else if (defaultValues?.id) {
        const result = await updateProject(defaultValues.id, data);
        if (!result.ok) {
          throw new Error(
            result.code === "CURRENCY_NOT_CONFIGURED"
              ? t(`Currency ${data.currency} belum dikonfigurasi. Atur currency workspace terlebih dahulu.`, `Currency ${data.currency} is not configured. Configure it in workspace settings first.`)
              : (result as { error?: string }).error ?? t("Gagal menyimpan", "Failed to save"),
          );
        }
      }

      toast.success(t("Project diperbarui", "Project updated"));
      if (onSuccess) onSuccess();
      else refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal menyimpan", "Failed to save"));
    } finally {
      setLoading(false);
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={`project-${key}`} className="text-xs font-medium">{label}</Label>
      <Input
        id={`project-${key}`}
        type={type}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        className="h-9 text-sm"
      />
    </div>
  );

  return (
    <form onSubmit={submit} className={mode === "create" ? "space-y-4" : "space-y-5"}>
      {missingBillingConfig && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-sm space-y-2.5">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">
                {t("Rate per Jam & Pengaturan Tagihan Belum Lengkap", "Hourly Rate & Billing Settings Incomplete")}
              </p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                {t(
                  "Untuk membuat proyek model per jam, tentukan rate per jam proyek atau atur default currency & hourly rate di pengaturan invoice workspace.",
                  "To create an hourly project, please set the hourly rate or configure your default workspace currency and hourly rate in invoice settings."
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              asChild
              className="h-8 rounded-lg bg-amber-600 px-3 text-xs font-semibold text-white hover:bg-amber-700"
            >
              <Link href="/app/settings?tab=invoice" target="_blank">
                {t("Buka Invoice Settings", "Open Invoice Settings")}
              </Link>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setMissingBillingConfig(false)}
              className="h-8 rounded-lg text-xs text-amber-900 hover:bg-amber-100"
            >
              {t("Tutup", "Dismiss")}
            </Button>
          </div>
        </div>
      )}

      <div className={`grid gap-4 ${mode === "create" || section !== "all" ? "grid-cols-1" : "sm:grid-cols-2"}`}>
        {/* Left Column: Basic Info */}
        {section !== "billing" && <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Informasi Umum", "General Info")}
          </h3>

          {field(t("Nama Project *", "Project Name *"), "name")}

          {mode === "create" && <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("Model Tagihan", "Billing Model")}</Label>
            <Select value={form.billingModel} onValueChange={(value) => setForm((current) => ({ ...current, billingModel: value as BillingModel, timeTrackingMode: value === "hourly" ? "billable" : "off" }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed_price">{t("Harga Tetap", "Fixed Price")}</SelectItem>
                <SelectItem value="hourly">{t("Per Jam", "Hourly")}</SelectItem>
              </SelectContent>
            </Select>
          </div>}

          {mode === "create" && form.billingModel === "hourly" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("Mata Uang", "Currency")}</Label>
                <Select value={form.currency} onValueChange={(val) => setForm((p) => ({ ...p, currency: val }))}>
                  <SelectTrigger className="h-9 bg-white text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IDR">IDR (Rp)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="SGD">SGD (S$)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="AUD">AUD (A$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("Rate per Jam", "Hourly Rate")}</Label>
                <Input
                  type="number"
                  placeholder="e.g. 50"
                  value={form.rate}
                  onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))}
                  className="h-9 bg-white text-xs"
                />
              </div>
            </div>
          )}

          {!clientId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Klien (Opsional)", "Client (Optional)")}</Label>
              <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                <PopoverAnchor asChild>
                <div className="relative">
                <Input
                  placeholder={t("Cari klien...", "Search client...")}
                  value={clientSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientSearch(val);
                    setClientSearchOpen(true);
                  }}
                  onClick={() => setClientSearchOpen((open) => !open)}
                  aria-expanded={clientSearchOpen}
                  aria-haspopup="listbox"
                  className="h-9 pr-9 text-sm"
                />
                <button type="button" aria-label={t("Buka daftar klien", "Toggle client list")} onClick={() => setClientSearchOpen((open) => !open)} className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground">
                  <ChevronDown className={`h-4 w-4 transition-transform ${clientSearchOpen ? "rotate-180" : ""}`} />
                </button>
                </div>
                </PopoverAnchor>
                <PopoverContent align="start" sideOffset={5} onOpenAutoFocus={(event) => event.preventDefault()} className="w-[var(--radix-popover-trigger-width)] p-1">
                  <div className="max-h-60 touch-pan-y overflow-y-auto overscroll-contain" onWheel={(event) => event.stopPropagation()}>
                    {filteredClients.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">{t("Klien tidak ditemukan", "No client found")}</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`flex min-h-10 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent ${form.clientId === c.id ? "bg-accent font-medium" : ""}`}
                          onClick={() => {
                            setForm((p) => ({ ...p, clientId: c.id }));
                            setClientSearch(c.name);
                            setClientSearchOpen(false);
                          }}
                        >
                          <span>{c.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                  <div className="border-t p-1 pt-2">
                    {quickClientMode ? (
                      <div className="flex gap-2">
                        <Input autoFocus value={quickClientName} onChange={(event) => setQuickClientName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void createQuickClient(); } if (event.key === "Escape") setQuickClientMode(false); }} placeholder={t("Nama klien", "Client name")} className="h-9 text-sm" />
                        <Button type="button" size="sm" className="h-9 shrink-0" disabled={!quickClientName.trim() || quickClientLoading} onClick={() => void createQuickClient()}>{quickClientLoading ? t("Menyimpan...", "Saving...") : t("Buat", "Create")}</Button>
                      </div>
                    ) : (
                      <Button type="button" variant="ghost" size="sm" className="min-h-10 w-full justify-start gap-2 text-sm" onClick={() => setQuickClientMode(true)}><Plus className="h-4 w-4" />{t("Buat klien baru", "Create new client")}</Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {mode === "edit" && <div className="grid gap-3 grid-cols-2">
            {field(t("Tanggal Mulai", "Start Date"), "startDate", "date")}
            {field(t("Target Selesai", "Target Finish Date"), "finishDate", "date")}
          </div>}

          {mode === "edit" && <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("Deskripsi", "Description")}</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>}

          <label className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              checked={form.clientVisible}
              onChange={(e) => setForm((p) => ({ ...p, clientVisible: e.target.checked }))}
            />
            <span className="space-y-0.5">
              <span className="block text-xs font-medium">
                {t("Tampilkan di Portal Klien", "Show in Client Portal")}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-tight">
                {t("Klien dapat melihat proyek dan progresnya.", "Clients can view project and progress.")}
              </span>
            </span>
          </label>
        </div>}

        {/* Right Column: Billing & Financials */}
        {mode === "edit" && section !== "general" && <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Pengaturan Tagihan", "Billing Settings")}
          </h3>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Model Tagihan", "Billing Model")}</Label>
              <Select
                value={form.billingModel}
                onValueChange={(v) => setForm((p) => ({ ...p, billingModel: v as BillingModel }))}
                disabled={billingModelLocked}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">{t("Harga Tetap", "Fixed Price")}</SelectItem>
                  <SelectItem value="hourly">{t("Per Jam", "Hourly")}</SelectItem>
                  {mode === "edit" && defaultValues?.billingModel === "retainer" && <SelectItem value="retainer">Retainer</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Mata Uang", "Currency")}</Label>
              <Select value={form.currency} onValueChange={(val) => setForm((p) => ({ ...p, currency: val }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="AUD">AUD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.billingModel === "fixed_price" && field(t(`Total Anggaran / Budget (${form.currency})`, `Budget (${form.currency})`), "budget", "number")}
          {form.billingModel === "hourly" && field(t(`Tarif per Jam (${form.currency})`, `Hourly Rate (${form.currency})`), "rate", "number")}

          {form.billingModel === "retainer" && (
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="grid gap-3 grid-cols-3">
                {field(t(`Biaya Bulanan (${form.currency})`, `Monthly Fee (${form.currency})`), "retainerFee", "number")}
                {field(t("Jam Termasuk (Menit)", "Included Minutes"), "retainerIncludedMinutes", "number")}
                {field(t("Tanggal Reset Bulanan", "Monthly Reset Day"), "retainerResetDay", "number")}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">{t("Kebijakan Kelebihan Jam", "Overage Policy")}</Label>
                <Select
                  value={form.retainerOveragePolicy}
                  onValueChange={(v) => setForm((p) => ({ ...p, retainerOveragePolicy: v as "none" | "warn" | "bill" }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("Abaikan", "Ignore")}</SelectItem>
                    <SelectItem value="warn">{t("Peringatan", "Warn")}</SelectItem>
                    <SelectItem value="bill">{t("Tagih Kelebihan", "Bill Overage")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.retainerOveragePolicy === "bill" && (
                field(t(`Tarif Kelebihan per Jam (${form.currency})`, `Overage Rate (${form.currency})`), "retainerOverageRate", "number")
              )}
            </div>
          )}
        </div>}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <DialogClose asChild>
          <Button type="button" variant="outline" size="sm">
            {t("Batal", "Cancel")}
          </Button>
        </DialogClose>
        <LoadingButton type="submit" loading={loading} size="sm">
          {mode === "create" ? t("Buat Proyek", "Create Project") : t("Simpan", "Save")}
        </LoadingButton>
      </div>
    </form>
  );
}
