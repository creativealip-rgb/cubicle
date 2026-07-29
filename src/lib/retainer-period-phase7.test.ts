import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildRetainerInvoiceLines,
  calculateRetainerUsage,
  getRetainerPeriodRange,
} from "./retainer-period";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("retainer period Phase 7", () => {
  it("calculates monthly periods from reset day with exclusive end", () => {
    expect(getRetainerPeriodRange("2026-07-09", 10)).toEqual({ start: "2026-06-10", end: "2026-07-10" });
    expect(getRetainerPeriodRange("2026-07-10", 10)).toEqual({ start: "2026-07-10", end: "2026-08-10" });
    expect(getRetainerPeriodRange("2026-07-31", 28)).toEqual({ start: "2026-07-28", end: "2026-08-28" });
  });

  it("calculates locked approved usage and billable overage", () => {
    expect(calculateRetainerUsage({ approvedMinutes: [60, 45, 30], includedMinutes: 120 })).toEqual({ approvedMinutes: 135, overageMinutes: 15 });
    expect(calculateRetainerUsage({ approvedMinutes: [30], includedMinutes: 120 })).toEqual({ approvedMinutes: 30, overageMinutes: 0 });
  });

  it("builds base fee and bill-policy overage invoice lines only", () => {
    expect(buildRetainerInvoiceLines({ fee: 5_000_000, currency: "IDR", periodStart: "2026-07-10", periodEnd: "2026-08-10", overagePolicy: "none", overageMinutes: 60, overageRate: 250_000 })).toEqual([
      { description: "Retainer 2026-07-10–2026-08-10", quantity: 1, unitPrice: 5_000_000, amount: 5_000_000 },
    ]);
    expect(buildRetainerInvoiceLines({ fee: 5_000_000, currency: "IDR", periodStart: "2026-07-10", periodEnd: "2026-08-10", overagePolicy: "bill", overageMinutes: 90, overageRate: 300_000 })).toEqual([
      { description: "Retainer 2026-07-10–2026-08-10", quantity: 1, unitPrice: 5_000_000, amount: 5_000_000 },
      { description: "Retainer overage 1.5 jam", quantity: 1.5, unitPrice: 300_000, amount: 450_000 },
    ]);
  });

  it("wires tenant-safe retainer actions with lock, invoice idempotency, and cancellation retry", () => {
    const actions = read("src/lib/actions/retainers.ts");
    expect(actions).toContain("export async function createOrGetRetainerPeriod");
    expect(actions).toContain("export async function lockRetainerPeriod");
    expect(actions).toContain("export async function generateRetainerInvoice");
    expect(actions).toContain("export async function cancelRetainerInvoice");
    expect(actions).toContain("assertWorkspaceWritable");
    expect(actions).toContain(".for(\"update\")");
    expect(actions).toContain("eq(retainerPeriods.workspaceId, workspaceId)");
    expect(actions).toContain("eq(retainerPeriods.status, \"open\")");
    expect(actions).toContain("eq(retainerPeriods.status, \"locked\")");
    expect(actions).toContain("eq(invoices.retainerPeriodId, period.id)");
    expect(actions).toContain("ne(invoices.status, \"cancelled\")");
    expect(actions).toContain("invoiceGeneration: sql`${retainerPeriods.invoiceGeneration} + 1`");
  });
});
