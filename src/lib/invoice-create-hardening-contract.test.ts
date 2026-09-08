import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const form = readFileSync("src/components/forms/invoice-form.tsx", "utf8");
const action = readFileSync("src/lib/actions/invoices.ts", "utf8");
const recurring = readFileSync("src/components/invoices/recurring-invoice-manager.tsx", "utf8");

describe("invoice create hardening", () => {
  it("never logs full invoice payloads and recovers stale actions", () => {
    expect(action).not.toContain("SERVER ACTION RECEIVED INPUT");
    expect(form).toContain("isStaleServerActionError");
  });

  it("supports tax rate, discount, and grand total end to end", () => {
    expect(action).toContain("taxRate: z.number()");
    expect(action).toContain("discount: z.number()");
    expect(form).toContain('id="taxRate"');
    expect(form).toContain('id="discount"');
    expect(form).toContain('t("Total", "Total")');
  });

  it("uses clear visual sections and progressive details", () => {
    expect(form).toContain('t("Tagihkan Kepada", "Bill to")');
    expect(form).toContain('t("Detail Invoice", "Invoice details")');
    expect(form).toContain("<details");
  });

  it("does not use native selects in recurring invoice form", () => {
    expect(recurring).not.toContain("<select");
  });
});
