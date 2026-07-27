import { describe, expect, it } from "vitest";
import { BILLING_PLANS, annualPlanExpiry } from "./billing-plans";

describe("annual billing plans", () => {
  it("charges Solo for twelve months without tax", () => {
    expect(BILLING_PLANS.solo.monthlyReferenceAmount).toBe(49_000);
    expect(BILLING_PLANS.solo.amount).toBe(588_000);
    expect(BILLING_PLANS.solo.taxAmount).toBe(0);
  });

  it("charges Team for twelve months without tax", () => {
    expect(BILLING_PLANS.team.monthlyReferenceAmount).toBe(99_000);
    expect(BILLING_PLANS.team.amount).toBe(1_188_000);
    expect(BILLING_PLANS.team.taxAmount).toBe(0);
  });

  it("activates paid plans for one calendar year", () => {
    expect(annualPlanExpiry(new Date("2026-07-27T10:00:00.000Z")).toISOString()).toBe(
      "2027-07-27T10:00:00.000Z",
    );
  });
});
