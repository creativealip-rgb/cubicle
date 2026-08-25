import { describe, expect, it } from "vitest";
import { BILLING_PLANS, getDisplayPlanAmount, getLandingPrice, getPlanAmount, type BillingPeriod, type BillingPlan, type DisplayCurrency } from "./landing-pricing";

type AmountCase = { name: string; plan: BillingPlan; period: BillingPeriod; currency: DisplayCurrency; amount: number };

const amountCases: AmountCase[] = [
  { name: "free monthly IDR", plan: "free", period: "monthly", currency: "IDR", amount: 0 },
  { name: "free monthly USD", plan: "free", period: "monthly", currency: "USD", amount: 0 },
  { name: "free yearly IDR", plan: "free", period: "yearly", currency: "IDR", amount: 0 },
  { name: "free yearly USD", plan: "free", period: "yearly", currency: "USD", amount: 0 },
  { name: "solo monthly IDR", plan: "solo", period: "monthly", currency: "IDR", amount: 75_000 },
  { name: "solo monthly USD", plan: "solo", period: "monthly", currency: "USD", amount: 5 },
  { name: "solo yearly IDR", plan: "solo", period: "yearly", currency: "IDR", amount: 900_000 },
  { name: "solo yearly USD", plan: "solo", period: "yearly", currency: "USD", amount: 60 },
  { name: "team monthly IDR", plan: "team", period: "monthly", currency: "IDR", amount: 165_000 },
  { name: "team monthly USD", plan: "team", period: "monthly", currency: "USD", amount: 10 },
  { name: "team yearly IDR", plan: "team", period: "yearly", currency: "IDR", amount: 1_980_000 },
  { name: "team yearly USD", plan: "team", period: "yearly", currency: "USD", amount: 120 },
];

describe("landing pricing", () => {
  it.each(amountCases)("uses exact amount: $name", ({ plan, period, currency, amount }) => {
    expect(getDisplayPlanAmount(plan, period, currency)).toBe(amount);
  });

  it("formats representative IDR, USD, and free prices", () => {
    expect(getLandingPrice("solo", "monthly", "IDR")).toBe("Rp 75.000");
    expect(getLandingPrice("team", "yearly", "USD")).toBe("$120");
    expect(getLandingPrice("free", "monthly", "IDR")).toBe("Rp 0");
  });

  it.each([
    ["free", 0, 0], ["solo", 75_000, 900_000], ["team", 165_000, 1_980_000],
  ] as const)("preserves authoritative billing values for %s", (plan, monthly, yearly) => {
    expect(BILLING_PLANS[plan].monthlyAmount).toBe(monthly);
    expect(BILLING_PLANS[plan].yearlyAmount).toBe(yearly);
    if (plan !== "free") {
      expect(getPlanAmount(plan, "monthly")).toBe(monthly);
      expect(getPlanAmount(plan, "yearly")).toBe(yearly);
    }
  });
});

export {};
