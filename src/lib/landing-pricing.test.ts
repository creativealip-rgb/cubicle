import { describe, expect, it } from "vitest";
import { getDisplayPlanAmount, getLandingPrice, getPlanAmount } from "./landing-pricing";

describe("landing pricing", () => {
  it("uses exact regional display matrix and preserves checkout amounts", () => {
    expect(["free", "solo", "team"].flatMap((plan) => ["monthly", "yearly"].flatMap((period) => ["IDR", "USD"].map((currency) => getDisplayPlanAmount(plan as any, period as any, currency as any))))).toEqual([0, 0, 0, 0, 75000, 5, 900000, 60, 165000, 10, 1980000, 120]);
    expect(getPlanAmount("solo", "yearly")).toBe(900000);
    expect(getLandingPrice("solo", "monthly", "USD")).toBe("$5");
  });
});

export {};