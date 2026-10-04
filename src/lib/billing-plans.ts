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
    monthlyAmount: 99_000,
    yearlyAmount: 1_188_000,
    monthlyEquivalent: 99_000,
    amount: 1_188_000,
    monthlyReferenceAmount: 99_000,
    taxAmount: 0,
  },
  team: {
    label: "Team",
    monthlyAmount: 199_000,
    yearlyAmount: 2_388_000,
    monthlyEquivalent: 199_000,
    amount: 2_388_000,
    monthlyReferenceAmount: 199_000,
    taxAmount: 0,
  },
} as const;

export const STORAGE_ADDONS = {
  5: { storageBytes: 5 * 1024 ** 3, monthlyAmount: 10_000 },
  10: { storageBytes: 10 * 1024 ** 3, monthlyAmount: 20_000 },
  15: { storageBytes: 15 * 1024 ** 3, monthlyAmount: 30_000 },
} as const;

export const EXTRA_WORKSPACE_ADDON = { monthlyAmount: 30_000 } as const;

export const EXTRA_MEMBER_ADDONS = {
  1: { quantity: 1, yearlyAmount: 120_000, label: "+1 Anggota Tim", labelEn: "+1 Team Member" },
  3: { quantity: 3, yearlyAmount: 270_000, label: "+3 Anggota Tim", labelEn: "+3 Team Members" },
  5: { quantity: 5, yearlyAmount: 390_000, label: "+5 Anggota Tim", labelEn: "+5 Team Members" },
} as const;

export type ExtraMemberAddonKey = keyof typeof EXTRA_MEMBER_ADDONS;

export function isExtraMemberAddonKey(value: unknown): value is ExtraMemberAddonKey {
  return value === 1 || value === 3 || value === 5 || value === "1" || value === "3" || value === "5";
}

export function getExtraMemberAddonAmount(tier: ExtraMemberAddonKey = 1): number {
  return EXTRA_MEMBER_ADDONS[tier]?.yearlyAmount ?? 120_000;
}

export const AI_REQUESTS_ADDONS = {
  500: { requestsQuota: 500, amount: 50_000, label: "500 AI Requests/bln" },
  1000: { requestsQuota: 1000, amount: 100_000, label: "1.000 AI Requests/bln" },
} as const;

export type AiRequestsAddonKey = keyof typeof AI_REQUESTS_ADDONS;

export const AI_REQUESTS_ADDON = AI_REQUESTS_ADDONS[1000];

export function isAiRequestsAddonKey(value: unknown): value is AiRequestsAddonKey {
  return value === 500 || value === 1000 || value === "500" || value === "1000";
}

export function getAiRequestsAddonAmount(tier: AiRequestsAddonKey = 1000): number {
  return AI_REQUESTS_ADDONS[tier]?.amount ?? 100_000;
}

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
