import { describe, expect, it } from "vitest";
import {
  defaultInvoiceSource,
  eligibleTimeEntriesInPeriod,
  fixedSourcePreview,
  sourceDraftComplete,
  type EligibleInvoiceTimeEntry,
} from "./invoice-source-ui";

const entries: EligibleInvoiceTimeEntry[] = [
  { id: "a", workDate: "2026-08-01", description: "Design", durationMinutes: 90, hourlyRate: 200_000 },
  { id: "b", workDate: "2026-08-31", description: "Build", durationMinutes: 30, hourlyRate: 300_000 },
  { id: "c", workDate: "2026-09-01", description: "Later", durationMinutes: 60, hourlyRate: 100_000 },
];

describe("invoice source UI state", () => {
  it("defaults Fixed without active history to full and with history to final", () => {
    expect(defaultInvoiceSource("fixed_price", { hasActiveFixedHistory: false })).toEqual({ mode: "fixed_full" });
    expect(defaultInvoiceSource("fixed_price", { hasActiveFixedHistory: true })).toEqual({ mode: "fixed_final" });
    expect(defaultInvoiceSource("hourly")).toBeNull();
  });

  it("builds Fixed agreed, previously invoiced, and remaining preview", () => {
    expect(fixedSourcePreview(1_000_000, 250_000)).toEqual({ agreedAmount: 1_000_000, previouslyInvoiced: 250_000, remainingAmount: 750_000 });
    expect(fixedSourcePreview(100, 140).remainingAmount).toBe(0);
  });

  it("filters eligible Time Entries using half-open period and totals preview", () => {
    expect(eligibleTimeEntriesInPeriod(entries, "2026-08-01", "2026-09-01")).toEqual({
      entries: entries.slice(0, 2),
      totalMinutes: 120,
      totalAmount: 450_000,
    });
  });

  it("clears period results for missing or invalid bounds", () => {
    expect(eligibleTimeEntriesInPeriod(entries, "", "2026-09-01").entries).toEqual([]);
    expect(eligibleTimeEntriesInPeriod(entries, "2026-09-01", "2026-09-01").entries).toEqual([]);
  });

  it("requires mode-specific fields", () => {
    expect(sourceDraftComplete({ mode: "fixed_dp", amountType: "percent", value: 25 })).toBe(true);
    expect(sourceDraftComplete({ mode: "fixed_milestone", amountType: "amount", value: 100 })).toBe(false);
    expect(sourceDraftComplete({ mode: "hourly_deposit", value: 100 })).toBe(true);
    expect(sourceDraftComplete({ mode: "hourly_timesheet", periodStart: "2026-08-01", periodEnd: "2026-09-01", timeEntryIds: ["id"] })).toBe(true);
  });
});
