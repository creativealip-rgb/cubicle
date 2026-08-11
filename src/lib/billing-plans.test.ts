import { describe, expect, it } from "vitest";
import {
  BILLING_PLANS,
  STORAGE_ADDONS,
  annualPlanExpiry,
  getPeriodExpiry,
  getPlanAmount,
  getStorageAddonAmount,
  isStorageAddonKey,
} from "./billing-plans";

describe("annual billing plans", () => {
  it("charges Solo for twelve months without tax", () => {
    expect(BILLING_PLANS.solo.monthlyReferenceAmount).toBe(75_000);
    expect(BILLING_PLANS.solo.amount).toBe(900_000);
    expect(BILLING_PLANS.solo.taxAmount).toBe(0);
  });

  it("charges Team for twelve months without tax", () => {
    expect(BILLING_PLANS.team.monthlyReferenceAmount).toBe(165_000);
    expect(BILLING_PLANS.team.amount).toBe(1_980_000);
    expect(BILLING_PLANS.team.taxAmount).toBe(0);
  });

  it("activates paid plans for one calendar year", () => {
    expect(annualPlanExpiry(new Date("2026-07-27T10:00:00.000Z")).toISOString()).toBe(
      "2027-07-27T10:00:00.000Z",
    );
  });
});

describe("monthly/yearly plan amounts", () => {
  it("quotes Solo monthly and yearly from final pricing", () => {
    expect(BILLING_PLANS.solo.monthlyAmount).toBe(75_000);
    expect(BILLING_PLANS.solo.yearlyAmount).toBe(900_000);
    expect(getPlanAmount("solo", "monthly")).toBe(75_000);
    expect(getPlanAmount("solo", "yearly")).toBe(900_000);
  });

  it("quotes Team monthly and yearly from final pricing", () => {
    expect(BILLING_PLANS.team.monthlyAmount).toBe(165_000);
    expect(BILLING_PLANS.team.yearlyAmount).toBe(1_980_000);
    expect(getPlanAmount("team", "monthly")).toBe(165_000);
    expect(getPlanAmount("team", "yearly")).toBe(1_980_000);
  });

  it("keeps annual amount backward compatible with legacy amount field", () => {
    expect(getPlanAmount("solo", "yearly")).toBe(BILLING_PLANS.solo.amount);
    expect(getPlanAmount("team", "yearly")).toBe(BILLING_PLANS.team.amount);
  });
});

describe("storage add-on pricing", () => {
  it("validates catalog keys and yearly prices", () => {
    expect(STORAGE_ADDONS[5].monthlyAmount).toBe(10_000);
    expect(getStorageAddonAmount(5, "yearly")).toBe(120_000);
    expect(getStorageAddonAmount(15, "monthly")).toBe(30_000);
    expect(isStorageAddonKey(10)).toBe(true);
    expect(isStorageAddonKey("15")).toBe(true);
    expect(isStorageAddonKey(20)).toBe(false);
  });
});

describe("billing period expiry", () => {
  it("activates monthly plans for one month", () => {
    expect(getPeriodExpiry(new Date("2026-07-27T10:00:00.000Z"), "monthly").toISOString()).toBe(
      "2026-08-27T10:00:00.000Z",
    );
  });

  it("activates yearly plans for one year", () => {
    expect(getPeriodExpiry(new Date("2026-07-27T10:00:00.000Z"), "yearly").toISOString()).toBe(
      "2027-07-27T10:00:00.000Z",
    );
  });

  it("matches legacy annualPlanExpiry for yearly period", () => {
    const start = new Date("2026-02-10T08:30:00.000Z");
    expect(getPeriodExpiry(start, "yearly").toISOString()).toBe(annualPlanExpiry(start).toISOString());
  });
});
