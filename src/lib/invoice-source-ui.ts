export type InvoiceSourceMode = "fixed_full" | "fixed_dp" | "fixed_milestone" | "fixed_final" | "hourly_timesheet" | "hourly_deposit";

export type InvoiceSourceDraft = {
  mode: InvoiceSourceMode;
  amountType?: "percent" | "amount";
  value?: number;
  milestoneName?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  timeEntryIds?: string[];
};

export function defaultInvoiceSource(billingType: string, hasInitialTimeEntries = false): InvoiceSourceDraft | null {
  if (["fixed_price", "project", "package"].includes(billingType)) return { mode: "fixed_final" };
  if (["hourly", "hours"].includes(billingType) && hasInitialTimeEntries) return { mode: "hourly_timesheet", timeEntryIds: [] };
  return null;
}

export function sourceDraftComplete(source: InvoiceSourceDraft | null): boolean {
  if (!source) return false;
  if (["fixed_full", "fixed_final"].includes(source.mode)) return true;
  if (["fixed_dp", "fixed_milestone"].includes(source.mode)) return Boolean(source.amountType && source.value && source.value > 0 && (source.mode !== "fixed_milestone" || source.milestoneName?.trim()));
  if (source.mode === "hourly_deposit") return Boolean(source.value && source.value > 0);
  return Boolean(source.periodStart && source.periodEnd && source.periodStart < source.periodEnd && source.timeEntryIds?.length);
}
