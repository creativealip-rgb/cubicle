"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateInvoice } from "@/lib/actions/invoices";
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
import { useT } from "@/lib/i18n-client";
import { invoiceStatusVariant } from "@/lib/status-badge";

const STATUSES = ["draft", "sent", "viewed", "paid", "overdue", "cancelled", "archived"] as const;

interface InvoiceMetaFormProps {
  invoiceId: string;
  defaults: {
    status: string;
    issueDate: string;
    dueDate?: string | null;
    currency: string;
    tax: string | number;
    discount: string | number;
    notes?: string | null;
    terms?: string | null;
  };
  /** Read-only project context (set at create; not editable here). */
  project?: {
    name: string;
    billingType: string | null;
    billingTypeLabel: string;
    packageName?: string | null;
    packageHours?: number | null;
  } | null;
}

export function InvoiceMetaForm({ invoiceId, defaults, project }: InvoiceMetaFormProps) {
  const { t, lang } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    status: defaults.status || "draft",
    issueDate: defaults.issueDate?.slice?.(0, 10) || String(defaults.issueDate).slice(0, 10),
    dueDate: defaults.dueDate ? String(defaults.dueDate).slice(0, 10) : "",
    currency: defaults.currency || "IDR",
    tax: String(defaults.tax ?? "0"),
    discount: String(defaults.discount ?? "0"),
    notes: defaults.notes ?? "",
    terms: defaults.terms ?? "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await updateInvoice(invoiceId, {
        status: form.status as (typeof STATUSES)[number],
        issueDate: form.issueDate,
        dueDate: form.dueDate || undefined,
        currency: form.currency,
        tax: Number(form.tax || 0),
        discount: Number(form.discount || 0),
        notes: form.notes || undefined,
        terms: form.terms || undefined,
      });
      toast.success(t("Invoice disimpan", "Invoice saved"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        {t(
          "Item tersimpan otomatis saat ditambah/dihapus. Detail invoice (status, pajak, catatan) disimpan lewat tombol di bawah.",
          "Line items auto-save on add/delete. Invoice meta (status, tax, notes) saves via the button below.",
        )}
      </div>
      {project ? (
        <div className="rounded-md border bg-muted/20 px-3 py-3 space-y-1.5">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {t("Proyek invoice", "Invoice project")}
          </p>
          <p className="text-sm font-medium leading-snug">{project.name}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium">
              {project.billingTypeLabel}
            </span>
            {project.billingType === "package" && project.packageName ? (
              <span className="text-xs text-muted-foreground">
                {project.packageName}
                {project.packageHours != null
                  ? ` · ${project.packageHours}${t(" jam", "h")}`
                  : ""}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t(
              "Proyek dipilih saat buat invoice (baca saja di sini).",
              "Project is set when the invoice is created (read-only here).",
            )}
          </p>
        </div>
      ) : (
        <div className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          {t(
            "Invoice ini tanpa proyek (import time = semua klien).",
            "This invoice has no project (time import = whole client).",
          )}
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("Status", "Status")}</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {invoiceStatusVariant(s, lang).label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("Mata uang", "Currency")}</Label>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            value={form.currency}
            onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}
          >
            {["IDR", "USD", "EUR", "SGD", "AUD", "GBP", "MYR", "JPY"].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>{t("Tanggal terbit", "Issue date")}</Label>
          <Input
            type="date"
            value={form.issueDate}
            onChange={(e) => setForm((p) => ({ ...p, issueDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("Jatuh tempo", "Due date")}</Label>
          <Input
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("Pajak (nominal)", "Tax amount")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.tax}
            onChange={(e) => setForm((p) => ({ ...p, tax: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>{t("Diskon (nominal)", "Discount amount")}</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.discount}
            onChange={(e) => setForm((p) => ({ ...p, discount: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{t("Catatan", "Notes")}</Label>
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>{t("Syarat", "Terms")}</Label>
          <Textarea
            rows={3}
            value={form.terms}
            onChange={(e) => setForm((p) => ({ ...p, terms: e.target.value }))}
          />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? t("Menyimpan…", "Saving…") : t("Simpan invoice", "Save invoice")}
      </Button>
    </form>
  );
}
