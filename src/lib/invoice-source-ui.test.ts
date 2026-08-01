import { describe, expect, it } from "vitest";
import { defaultInvoiceSource, sourceDraftComplete } from "./invoice-source-ui";

describe("invoice source UI state", () => {
  it("defaults Fixed to final and Hourly to explicit selection", () => {
    expect(defaultInvoiceSource("fixed_price")).toEqual({ mode: "fixed_final" });
    expect(defaultInvoiceSource("hourly")).toBeNull();
  });
  it("requires mode-specific fields", () => {
    expect(sourceDraftComplete({ mode: "fixed_dp", amountType: "percent", value: 25 })).toBe(true);
    expect(sourceDraftComplete({ mode: "fixed_milestone", amountType: "amount", value: 100 })).toBe(false);
    expect(sourceDraftComplete({ mode: "hourly_deposit", value: 100 })).toBe(true);
    expect(sourceDraftComplete({ mode: "hourly_timesheet", periodStart: "2026-08-01", periodEnd: "2026-09-01", timeEntryIds: ["id"] })).toBe(true);
  });
});
