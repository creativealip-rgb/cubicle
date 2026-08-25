import { BILLING_PLANS, type BillingPeriod, type BillingPlan, getPlanAmount } from "@/lib/billing-plans";

export type DisplayCurrency = "IDR" | "USD";

export function getDisplayPlanAmount(plan: BillingPlan, period: BillingPeriod, currency: DisplayCurrency) {
  if (plan === "free") return 0;
  const idr = getPlanAmount(plan, period);
  return currency === "USD" ? Math.round(idr / 15_000) : idr;
}

export function formatDisplayPrice(amount: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(currency === "IDR" ? "id-ID" : "en-US", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(amount);
}

export function getLandingPrice(plan: BillingPlan, period: BillingPeriod, currency: DisplayCurrency) {
  return formatDisplayPrice(getDisplayPlanAmount(plan, period, currency), currency);
}

export function inferCurrency(country: string | undefined): DisplayCurrency {
  return country?.toUpperCase() === "ID" ? "IDR" : "USD";
}

export { BILLING_PLANS, getPlanAmount };
export type { BillingPeriod, BillingPlan };
export const landingPlanPrices = BILLING_PLANS;

// Public display only; checkout remains IDR in BILLING_PLANS.