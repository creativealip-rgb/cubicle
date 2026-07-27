export const BILLING_PLANS = {
  free: {
    label: "Free",
    amount: 0,
    monthlyReferenceAmount: 0,
    taxAmount: 0,
  },
  solo: {
    label: "Solo",
    amount: 588_000,
    monthlyReferenceAmount: 49_000,
    taxAmount: 0,
  },
  team: {
    label: "Team",
    amount: 1_188_000,
    monthlyReferenceAmount: 99_000,
    taxAmount: 0,
  },
} as const;

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
