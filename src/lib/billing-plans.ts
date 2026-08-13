export const BILLING_PLANS = {
  free: {
    label: "Free Forever",
    monthlyAmount: 0,
    yearlyAmount: 0,
    monthlyEquivalent: 0,
    amount: 0,
    monthlyReferenceAmount: 0,
    taxAmount: 0,
  },
  solo: {
    label: "Solo",
    monthlyAmount: 75_000,
    yearlyAmount: 900_000,
    monthlyEquivalent: 75_000,
    amount: 900_000,
    monthlyReferenceAmount: 75_000,
    taxAmount: 0,
  },
  team: {
    label: "Team",
    monthlyAmount: 165_000,
    yearlyAmount: 1_980_000,
    monthlyEquivalent: 165_000,
    amount: 1_980_000,
    monthlyReferenceAmount: 165_000,
    taxAmount: 0,
  },
} as const;

export const STORAGE_ADDONS = {
  5: { storageBytes: 5 * 1024 ** 3, monthlyAmount: 10_000 },
  10: { storageBytes: 10 * 1024 ** 3, monthlyAmount: 20_000 },
  15: { storageBytes: 15 * 1024 ** 3, monthlyAmount: 30_000 },
} as const;

export const EXTRA_WORKSPACE_ADDON = { monthlyAmount: 30_000 } as const;

export type StorageAddonKey = keyof typeof STORAGE_ADDONS;

export function isStorageAddonKey(value: unknown): value is StorageAddonKey {
  return value === 5 || value === 10 || value === 15 || value === "5" || value === "10" || value === "15";
}

export function getStorageAddonAmount(addon: StorageAddonKey, period: BillingPeriod) {
  // Yearly add-on price = monthly price × 12 (e.g. +5 GB yearly = Rp120.000).
  const monthly = STORAGE_ADDONS[addon].monthlyAmount;
  return period === "monthly" ? monthly : monthly * 12;
}

export function getStorageAddonBytes(addon: StorageAddonKey) {
  return STORAGE_ADDONS[addon].storageBytes;
}

export function getExtraWorkspaceAmount(period: BillingPeriod) {
  // Yearly add-on price = monthly price × 12 (Rp360.000/year).
  return period === "monthly"
    ? EXTRA_WORKSPACE_ADDON.monthlyAmount
    : EXTRA_WORKSPACE_ADDON.monthlyAmount * 12;
}

export type BillingPeriod = "monthly" | "yearly";

export function getPlanAmount(plan: PaidBillingPlan, period: BillingPeriod) {
  return BILLING_PLANS[plan][period === "monthly" ? "monthlyAmount" : "yearlyAmount"];
}

/**
 * Add one calendar period to a start date using clamped UTC arithmetic:
 * clone the start, move to day 1, advance the month/year, then clamp the
 * original day-of-month to the target month's final UTC day. This keeps
 * month-end expiries on the last day of the target month (2026-01-31 →
 * 2026-02-28) and leap-day yearly expiries on Feb 28 (2024-02-29 →
 * 2025-02-28) instead of overflowing into the following month.
 */
export function getPeriodExpiry(start: Date, period: BillingPeriod) {
  const target = new Date(start);
  const day = target.getUTCDate();

  target.setUTCDate(1);
  if (period === "monthly") target.setUTCMonth(target.getUTCMonth() + 1);
  else target.setUTCFullYear(target.getUTCFullYear() + 1);

  // Final UTC day of the target month (month + 1, day 0 = last day of month).
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

export type BillingPlan = keyof typeof BILLING_PLANS;
export type PaidBillingPlan = Exclude<BillingPlan, "free">;

export function isBillingPlan(value: unknown): value is BillingPlan {
  return value === "free" || value === "solo" || value === "team";
}

export function annualPlanExpiry(start: Date) {
  const expiresAt = new Date(start);
  expiresAt.setUTCFullYear(expiresAt.getUTCFullYear() + 1);
  return expiresAt;
}
