import { describe, expect, it } from "vitest";
import { billingDateInTimezone, ProjectInvoiceSourceSchema, resolveFixedSourceAmount } from "./project-invoice-sources";

const projectId = "11111111-1111-4111-8111-111111111111";
const entryId = "22222222-2222-4222-8222-222222222222";

describe("ProjectInvoiceSource contract", () => {
  it("accepts generic fixed, hourly, and deposit sources", () => {
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_full", projectId })).toEqual({ mode: "fixed_full", projectId });
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_dp", projectId, percentage: 25 })).toMatchObject({ mode: "fixed_dp", percentage: 25 });
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_milestone", projectId, milestoneName: "Desain disetujui", amount: 100 })).toMatchObject({ mode: "fixed_milestone", milestoneName: "Desain disetujui", amount: 100 });
    expect(ProjectInvoiceSourceSchema.parse({ mode: "fixed_final", projectId }).mode).toBe("fixed_final");
    expect(ProjectInvoiceSourceSchema.parse({ mode: "hourly_timesheet", projectId, timeEntryIds: [entryId], periodStart: "2026-01-01", periodEnd: "2026-02-01" }).mode).toBe("hourly_timesheet");
    expect(ProjectInvoiceSourceSchema.parse({ mode: "hourly_deposit", projectId, amount: 100 }).mode).toBe("hourly_deposit");
  });

  it("rejects ambiguous amounts, empty timesheets, invalid periods, unknown keys, and retainer period", () => {
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_dp", projectId, amount: 10, percentage: 10 })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_milestone", projectId })).toThrow();
    expect(() => ProjectInvoiceSourceSchema.parse({ mode: "fixed_milestone", projectId, amount: 100 })).toThrow();
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

describe("billingDateInTimezone", () => {
  it("prefers workDate and converts startTime using workspace timezone", () => {
    expect(billingDateInTimezone("2026-08-02", new Date("2026-08-01T17:30:00Z"), "Asia/Jakarta")).toBe("2026-08-02");
    expect(billingDateInTimezone(null, new Date("2026-08-01T17:30:00Z"), "Asia/Jakarta")).toBe("2026-08-02");
    expect(billingDateInTimezone(null, new Date("2026-08-01T17:30:00Z"), "UTC")).toBe("2026-08-01");
  });
});
