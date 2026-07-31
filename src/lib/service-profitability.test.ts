import { describe, expect, it } from "vitest";
import { calculateServiceProfitability } from "@/lib/service-profitability";

describe("service profitability", () => {
  it("calculates sold, cost, margin, and estimate variance", () => {
    expect(calculateServiceProfitability({ soldAmount: 1_000_000, actualMinutes: 600, costRatePerHour: 40_000, estimatedMinutes: 480 })).toEqual({ soldAmount: 1_000_000, costAmount: 400_000, marginAmount: 600_000, marginPercent: 60, estimatedMinutes: 480, actualMinutes: 600, varianceMinutes: 120 });
  });
  it("handles zero sold amount", () => {
    expect(calculateServiceProfitability({ soldAmount: 0, actualMinutes: 60, costRatePerHour: 10_000, estimatedMinutes: null }).marginPercent).toBe(0);
  });
});
