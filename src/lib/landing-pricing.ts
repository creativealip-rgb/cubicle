import { BILLING_PLANS, type BillingPeriod, type BillingPlan, getPlanAmount } from "@/lib/billing-plans";
import type { DisplayCurrency } from "@/lib/region-preferences";

const DISPLAY_PRICES = {
  free: { IDR: { monthly: 0, yearly: 0 }, USD: { monthly: 0, yearly: 0 } },
  solo: { IDR: { monthly: 75_000, yearly: 900_000 }, USD: { monthly: 5, yearly: 60 } },
  team: { IDR: { monthly: 165_000, yearly: 1_980_000 }, USD: { monthly: 10, yearly: 120 } },
} as const;

export type { DisplayCurrency };

export function getDisplayPlanAmount(plan: BillingPlan, period: BillingPeriod, currency: DisplayCurrency) {
  return DISPLAY_PRICES[plan][currency][period];
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