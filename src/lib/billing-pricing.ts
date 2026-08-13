/**
 * Shared client-safe billing pricing + period helpers.
 *
 * Single source for the "cubiqlo:billing:period" localStorage key and for
 * exact Rupiah formatting used across billing UI (checkout button, add-on
 * purchase controls, billing page, topbar, upgrade banners, docs).
 *
 * This module must stay import-safe for client components: it has no
 * `"use server"` directive and no server-only imports — only
 * `billing-plans` (pure) and plain DOM APIs guarded for SSR.
 */

import {
  BILLING_PLANS,
  getExtraWorkspaceAmount,
  getPlanAmount,
  getStorageAddonAmount,
  type BillingPeriod,
  type PaidBillingPlan,
  type StorageAddonKey,
} from "@/lib/billing-plans";

export const PERIOD_STORAGE_KEY = "cubiqlo:billing:period";

export function loadStoredPeriod(fallback: BillingPeriod = "yearly"): BillingPeriod {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(PERIOD_STORAGE_KEY);
    return stored === "monthly" || stored === "yearly" ? stored : fallback;
  } catch {
    return fallback;
  }
}

export function persistPeriod(period: BillingPeriod) {
  try {
    window.localStorage.setItem(PERIOD_STORAGE_KEY, period);
  } catch {
    // localStorage unavailable — the period still applies to this checkout.
  }
}

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

// Re-exported so client components can import the period type from this
// client-safe module instead of reaching into billing-plans directly.
export type { BillingPeriod };

/** A paid plan entry from the BILLING_PLANS catalog (solo or team). */
type PaidPlanEntry = (typeof BILLING_PLANS)[PaidBillingPlan];

/**
 * Exact Rupiah amount, e.g. 75_000 → "Rp 75.000" and 1_980_000 → "Rp 1.980.000"
 * (id-ID grouping). No "rb/jt" abbreviations and no discount framing — yearly
 * is exactly 12 × monthly.
 */
export function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

/** Yearly amount for a paid plan (exact, e.g. "Rp 900.000"). */
export function getPlanYearlyLabel(plan: PaidPlanEntry): string {
  return formatRupiah(plan.yearlyAmount);
}

/** Monthly amount for a paid plan (exact, e.g. "Rp 75.000"). */
export function getPlanMonthlyLabel(plan: PaidPlanEntry): string {
  return formatRupiah(plan.monthlyAmount);
}

/** Storage add-on amount for a period (e.g. +5 GB monthly "Rp 10.000"). */
export function getStorageAddonLabel(addon: StorageAddonKey, period: BillingPeriod): string {
  return formatRupiah(getStorageAddonAmount(addon, period));
}

/** Extra-workspace slot amount for a period (e.g. monthly "Rp 30.000"). */
export function getExtraWorkspaceLabel(period: BillingPeriod): string {
  return formatRupiah(getExtraWorkspaceAmount(period));
}

/** Exact monthly/yearly prices for a paid plan card (e.g. "Rp 75.000 / Rp 900.000"). */
export function getPlanPricesLabel(plan: PaidPlanEntry): string {
  return `${getPlanMonthlyLabel(plan)} / ${getPlanYearlyLabel(plan)}`;
}

/**
 * Amount label for the currently selected billing period — used by the
 * checkout button and add-on purchase controls so the visible price always
 * matches the exact amount POSTed to the checkout route.
 */
export function getPlanPeriodLabel(plan: PaidBillingPlan, period: BillingPeriod): string {
  return formatRupiah(getPlanAmount(plan, period));
}

export function getStorageAddonPeriodLabel(addon: StorageAddonKey, period: BillingPeriod): string {
  return formatRupiah(getStorageAddonAmount(addon, period));
}

export function getExtraWorkspacePeriodLabel(period: BillingPeriod): string {
  return formatRupiah(getExtraWorkspaceAmount(period));
}

export { BILLING_PLANS };
