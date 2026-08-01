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

export type EligibleInvoiceTimeEntry = {
  id: string;
  workDate: string;
  description: string | null;
  durationMinutes: number;
  hourlyRate: number;
};

export function defaultInvoiceSource(
  billingType: string,
  options: { hasActiveFixedHistory?: boolean; hasInitialTimeEntries?: boolean } | boolean = {},
): InvoiceSourceDraft | null {
  const normalized = typeof options === "boolean" ? { hasInitialTimeEntries: options } : options;
  if (["fixed_price", "project", "package"].includes(billingType)) {
    return { mode: normalized.hasActiveFixedHistory ? "fixed_final" : "fixed_full" };
  }
  if (["hourly", "hours"].includes(billingType) && normalized.hasInitialTimeEntries) return { mode: "hourly_timesheet", timeEntryIds: [] };
  return null;
}

export function fixedSourcePreview(agreedAmount: number, previouslyInvoiced: number) {
  return {
    agreedAmount,
    previouslyInvoiced,
    remainingAmount: Math.max(0, agreedAmount - previouslyInvoiced),
  };
}

export function eligibleTimeEntriesInPeriod(entries: EligibleInvoiceTimeEntry[], periodStart?: string, periodEnd?: string) {
  const filtered = periodStart && periodEnd && periodStart < periodEnd
    ? entries.filter((entry) => entry.workDate >= periodStart && entry.workDate < periodEnd)
    : [];
  return {
    entries: filtered,
    totalMinutes: filtered.reduce((sum, entry) => sum + entry.durationMinutes, 0),
    totalAmount: filtered.reduce((sum, entry) => sum + entry.durationMinutes / 60 * entry.hourlyRate, 0),
  };
}

export function sourceDraftComplete(source: InvoiceSourceDraft | null): boolean {
  if (!source) return false;
  if (["fixed_full", "fixed_final"].includes(source.mode)) return true;
  if (["fixed_dp", "fixed_milestone"].includes(source.mode)) return Boolean(source.amountType && source.value && source.value > 0 && (source.mode !== "fixed_milestone" || source.milestoneName?.trim()));
  if (source.mode === "hourly_deposit") return Boolean(source.value && source.value > 0);
  return Boolean(source.periodStart && source.periodEnd && source.periodStart < source.periodEnd && source.timeEntryIds?.length);
}
