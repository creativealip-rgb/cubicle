import { describe, expect, it } from "vitest";
import { activationRequirementsMet, comparePercent, getRangeWindow, moneyMetrics, unavailableMetric } from "./admin-growth-metrics";

describe("admin growth metric contracts", () => {
  it.each([["7d", 7], ["30d", 30], ["90d", 90], ["12m", 365]] as const)("maps %s to bounded period", (range, days) => {
    const window = getRangeWindow(range, new Date("2026-09-16T00:00:00Z"));
    expect(window.days).toBe(days);
    expect(window.end.toISOString()).toBe("2026-09-16T00:00:00.000Z");
    expect(window.start < window.end).toBe(true);
  });

  it("requires client, project, and meaningful activity for activation", () => {
    expect(activationRequirementsMet({ clients: 1, projects: 1, tasks: 0, invoices: 0, timeEntries: 0, portalVisits: 1 })).toBe(true);
    expect(activationRequirementsMet({ clients: 1, projects: 1, tasks: 0, invoices: 0, timeEntries: 0, portalVisits: 0 })).toBe(false);
  });

  it("avoids invalid comparison percentages", () => {
    expect(comparePercent(12, 10)).toBe(20);
    expect(comparePercent(12, 0)).toBeNull();
  });

  it("calculates monthly money metrics", () => {
    expect(moneyMetrics(100, 1200, 4)).toEqual({ mrr: 100, arr: 1200, arpu: 25 });
  });

  it("marks unavailable metrics instead of zero", () => {
    expect(unavailableMetric("No event or spend data in Phase 1")).toEqual({ status: "unavailable", reason: "No event or spend data in Phase 1" });
  });
});

