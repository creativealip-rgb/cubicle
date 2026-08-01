import { describe, expect, it } from "vitest";
import { ProjectInvoiceSourceSchema, resolveFixedSourceAmount } from "./project-invoice-sources";

const projectId = "11111111-1111-4111-8111-111111111111";
const entryId = "22222222-2222-4222-8222-222222222222";

describe("ProjectInvoiceSource contract", () => {
  it("accepts generic fixed, hourly, and deposit sources", () => {
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_full", projectId })).toEqual({ mode: "fixed_full", projectId });
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_dp", projectId, percentage: 25 }).percentage).toBe(25);
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_milestone", projectId, amount: 100 }).amount).toBe(100);
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_final", projectId }).mode).toBe("fixed_final");
    expect(ProjectInvoiceSourceSchema.parse({ mode: "hourly_timesheet", projectId, timeEntryIds: [entryId], periodStart: "2026-01-01", periodEnd: "2026-02-01" }).mode).toBe("hourly_timesheet");
    expect(ProjectInvoiceSourceSchema.parse({ mode: "hourly_deposit", projectId, amount: 100 }).mode).toBe("hourly_deposit");
  });

  it("rejects ambiguous amounts, empty timesheets, invalid periods, unknown keys, and retainer period", () => {
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_dp", projectId, amount: 10, percentage: 10 })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_milestone", projectId })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_dp", projectId, amount: 0 })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "hourly_timesheet", projectId, timeEntryIds: [], periodStart: "2026-01-01", periodEnd: "2026-02-01" })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "hourly_timesheet", projectId, timeEntryIds: [entryId], periodStart: "2026-02-01", periodEnd: "2026-02-01" })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_full", projectId, surprise: true })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "retainer_period", projectId })).toThrow();
  });
});

describe("resolveFixedSourceAmount", () => {
  const context = { agreedAmount: "1000.00", priorActiveOriginalAmounts: ["100.10", "199.90"] };
  it("allows full only without active history", () => {
    expect(resolveFixedSourceAmount({ mode: "fixed_full" }, { ...context, priorActiveOriginalAmounts: [] })).toBe("1000.00");
    expect(() => resolveFixedSourceAmount({ mode: "fixed_full" }, context)).toThrow(/history/i);
  });
  it("resolves final remaining with decimal-safe arithmetic", () => {
    expect(resolveFixedSourceAmount({ mode: "fixed_final" }, context)).toBe("700.00");
  });
  it("resolves bounded DP and milestone representations", () => {
    expect(resolveFixedSourceAmount({ mode: "fixed_dp", percentage: 25 }, context)).toBe("250.00");
    expect(resolveFixedSourceAmount({ mode: "fixed_milestone", amount: 200.25 }, context)).toBe("200.25");
    expect(() => resolveFixedSourceAmount({ mode: "fixed_dp", amount: 700.01 }, context)).toThrow(/remaining/i);
  });
});
