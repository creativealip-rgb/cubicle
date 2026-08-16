"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { createOrGetRetainerPeriod, generateRetainerInvoice, lockRetainerPeriod } from "@/lib/actions/retainers";
import { getRetainerPeriodUsageSummary } from "@/lib/retainer-period";
import { formatMoney } from "@/lib/utils";
import { Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export type RetainerPeriodView = {
  id: string; periodStart: string; periodEnd: string; feeSnapshot: string;
  currencySnapshot: string; includedMinutesSnapshot: number; approvedMinutes: number;
  overageMinutes: number; overagePolicySnapshot: string; overageRateSnapshot: string | null;
  status: "open" | "locked" | "invoiced";
};

const hours = (value: number) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 }).format(value);

export function RetainerProjectInvoiceActions({ projectId, period, renderSummaryOnly }: { projectId: string; period: RetainerPeriodView | null; renderSummaryOnly?: boolean }) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [pending, setPending] = useState(false);
  const summary = period ? getRetainerPeriodUsageSummary({
    periodStart: period.periodStart, periodEnd: period.periodEnd, fee: Number(period.feeSnapshot),
    includedMinutes: period.includedMinutesSnapshot, approvedMinutes: period.approvedMinutes,
    overageMinutes: period.overageMinutes, overagePolicy: period.overagePolicySnapshot,
    overageRate: period.overageRateSnapshot == null ? null : Number(period.overageRateSnapshot),
  }) : null;
  const periodCurrency = period?.currencySnapshot ?? "IDR";

  async function createInvoice() {
    setPending(true);
    try {
      let current = period ?? await createOrGetRetainerPeriod({ projectId, workDate: new Date().toISOString().slice(0, 10) });
      if (current.status === "open") current = await lockRetainerPeriod(current.id);
      if (current.status === "locked") await generateRetainerInvoice({ retainerPeriodId: current.id, issueDate: new Date().toISOString().slice(0, 10) });
      toast.success(t("Invoice Retainer dibuat", "Retainer invoice created"));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal membuat invoice Retainer", "Failed to create retainer invoice"));
    } finally { setPending(false); }
  }

  if (renderSummaryOnly) {
    return summary ? (
      <div className="rounded-lg border bg-muted/20 p-4">
        <p className="mb-3 text-sm font-semibold">{t("Ringkasan penggunaan periode", "Period usage summary")}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="text-muted-foreground">{t("Periode", "Period")}</dt><dd className="font-medium">{summary.period}</dd></div>
          <div><dt className="text-muted-foreground">Fee</dt><dd className="font-medium">{formatMoney(summary.fee, periodCurrency)}</dd></div>
          <div><dt className="text-muted-foreground">{t("Jam termasuk", "Included hours")}</dt><dd className="font-medium">{hours(summary.includedHours)} jam</dd></div>
          <div><dt className="text-muted-foreground">{t("Terpakai disetujui", "Approved used")}</dt><dd className="font-medium">{hours(summary.approvedUsedHours)} jam</dd></div>
          <div><dt className="text-muted-foreground">Overage</dt><dd className="font-medium">{hours(summary.overageHours)} jam</dd></div>
          {summary.overageValue !== null ? <div><dt className="text-muted-foreground">{t("Nilai overage", "Overage value")}</dt><dd className="font-medium">{formatMoney(summary.overageValue, periodCurrency)}</dd></div> : null}
        </dl>
      </div>
    ) : null;
  }

  return period?.status !== "invoiced" ? (
    <LoadingButton size="sm" loading={pending} loadingText={t("Memproses…", "Processing…")} onClick={createInvoice} className="gap-1">
      <Plus className="h-4 w-4" /> {t("Buat Invoice", "Create Invoice")}
    </LoadingButton>
  ) : null;
}