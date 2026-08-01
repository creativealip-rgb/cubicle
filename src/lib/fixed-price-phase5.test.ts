import { describe, expect, it } from "vitest";
import { resolveFixedPriceInvoiceAmount } from "./invoice-project-items";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("Phase 5 fixed-price invoice source", () => {
  it("uses remaining agreed project value", () => {
    expect(resolveFixedPriceInvoiceAmount(10_000_000, 4_000_000)).toBe(6_000_000);
  });

  it("never returns a negative remaining value", () => {
    expect(resolveFixedPriceInvoiceAmount(10_000_000, 12_000_000)).toBe(0);
  });

  it("rejects non-finite billing values", () => {
    expect(() => resolveFixedPriceInvoiceAmount(Number.NaN, 0)).toThrow("Nilai Fixed Price tidak valid");
  });
});

describe("Phase 5 fixed-price portal privacy", () => {
  it("partitions time-visible projects before every portal time query", () => {
    const page = read("src/app/client-portal/[token]/page.tsx");
    expect(page).toContain("timeVisibleProjectIds");
    expect(page).toContain("resolveBillingModel(p) !== \"fixed_price\"");
    expect(page).not.toContain("inArray(timeEntries.projectId, visibleProjectIds)");
  });

  it("marks project invoice lines with explicit fixed source intent", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toContain('billingSource: projectItemValues.length ? "fixed_price" : null');
    expect(actions).toContain("resolveFixedSourceAmount");
    expect(actions).toContain('inArray(invoiceItems.sourceMode, ["fixed_full", "fixed_dp", "fixed_milestone", "fixed_final"])');
    expect(actions).toContain("priorActiveOriginalAmounts");
  });
});
