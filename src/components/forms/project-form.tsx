"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";
import { useAppTransition } from "@/lib/transition-provider";

type BillingModel = "fixed_price" | "hourly" | "retainer";
type Defaults = {
  id?: string;
  name?: string;
  description?: string;
  clientId?: string;
  status?: string;
  billingModel?: BillingModel;
  billingType?: string;
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
  onSuccess,
}: {
  mode: "create" | "edit";
  clientId?: string;
  clients?: Array<{ id: string; name: string }>;
  defaultValues?: Defaults;
  onSuccess?: () => void;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);

  const [clientSearch, setClientSearch] = useState(() => {
    const selected = clients.find((c) => c.id === (defaultValues?.clientId ?? clientId ?? ""));
    return selected?.name ?? "";
  });
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const clientContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clientContainerRef.current && !clientContainerRef.current.contains(e.target as Node)) {
        setClientSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredClients = useMemo(() => {
    const term = clientSearch.toLowerCase().trim();
    if (!term) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(term));
  }, [clients, clientSearch]);

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
    clientVisible: defaultValues?.clientVisible ?? Boolean(clientId),
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...form,
        billingModel: form.billingModel as BillingModel,
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

      if (mode === "create") {
        const result = await createProject(data);
        if (!result.ok) throw new Error(result.error);
      } else if (defaultValues?.id) {
        const result = await updateProject(defaultValues.id, data);
        if (!result.ok) throw new Error(result.error);
      }

      toast.success(
        mode === "create"
          ? t("Project dibuat", "Project created")
          : t("Project diperbarui", "Project updated")
      );
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
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        type={type}
        value={String(form[key] ?? "")}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        className="h-9 text-sm"
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Left Column: Basic Info */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Informasi Umum", "General Info")}
          </h3>

          {field(t("Nama Project *", "Project Name *"), "name")}

          {!clientId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Klien *", "Client *")}</Label>
              <div ref={clientContainerRef} className="relative">
                <Input
                  placeholder={t("Cari klien...", "Search client...")}
                  value={clientSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientSearch(val);
                    setClientSearchOpen(true);
                  }}
                  onFocus={() => {
                    const currentClient = clients.find((c) => c.id === form.clientId);
                    if (clientSearch.trim() !== currentClient?.name.trim()) {
                      setClientSearchOpen(true);
                    }
                  }}
                  className="h-9 text-sm"
                />
                {clientSearchOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {filteredClients.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">{t("Klien tidak ditemukan", "No client found")}</p>
                    ) : (
                      filteredClients.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${form.clientId === c.id ? "bg-accent font-medium" : ""}`}
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
                )}
              </div>
            </div>
          )}

          <div className="grid gap-3 grid-cols-2">
            {field(t("Tanggal Mulai", "Start Date"), "startDate", "date")}
            {field(t("Target Selesai", "Target Finish Date"), "finishDate", "date")}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("Deskripsi", "Description")}</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={3}
            />
          </div>

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
        </div>

        {/* Right Column: Billing & Financials */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Pengaturan Tagihan", "Billing Settings")}
          </h3>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Model Tagihan", "Billing Model")}</Label>
              <Select
                value={form.billingModel}
                onValueChange={(v) => setForm((p) => ({ ...p, billingModel: v as BillingModel }))}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">{t("Harga Tetap", "Fixed Price")}</SelectItem>
                  <SelectItem value="hourly">{t("Per Jam", "Hourly")}</SelectItem>
                  <SelectItem value="retainer">Retainer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Mata Uang", "Currency")}</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IDR">IDR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="SGD">SGD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.billingModel === "fixed_price" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
              {field(t(`Nilai Proyek (${form.currency})`, `Project Value (${form.currency})`), "budget", "number")}
            </div>
          )}

          {form.billingModel === "hourly" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
              {field(t(`Tarif per Jam (${form.currency})`, `Hourly Rate (${form.currency})`), "rate", "number")}
              {field(t(`Estimasi Budget (${form.currency})`, `Estimated Budget (${form.currency})`), "budget", "number")}
            </div>
          )}

          {form.billingModel === "retainer" && (
            <div className="space-y-3 rounded-lg border p-3 bg-muted/10">
              {field(t(`Biaya Retainer (${form.currency})`, `Retainer Fee (${form.currency})`), "retainerFee", "number")}
              <div className="grid gap-3 grid-cols-2">
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
        </div>
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
