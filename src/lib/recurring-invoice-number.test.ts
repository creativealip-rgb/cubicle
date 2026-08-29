import { describe, expect, it } from "vitest";
import { nextRecurringInvoiceDate, renderRecurringInvoiceNumber, validateRecurringInvoiceNumberPattern } from "./recurring-invoice-number";

describe("recurring invoice numbering", () => {
  it("normalizes and renders supported tokens", () => {
    expect(validateRecurringInvoiceNumberPattern(" inv-{yyyy}-{seq} ")).toBe("INV-{YYYY}-{SEQ}");
    expect(renderRecurringInvoiceNumber("INV-{YYYY}-{SEQ}", 2026, 7)).toBe("INV-2026-0007");
    expect(renderRecurringInvoiceNumber("INV-{SEQ}", 2026, 12345)).toBe("INV-12345");
  });

  it.each(["INV-{YYYY}", "INV-{SEQ}-{SEQ}", "INV-{YYYY}-{YYYY}-{SEQ}", "INV-{YY}-{SEQ}", "INV-{SEQ"])("rejects invalid pattern %s", (pattern) => {
    expect(() => validateRecurringInvoiceNumberPattern(pattern)).toThrow();
  });

  it("rejects invalid sequence", () => {
    expect(() => renderRecurringInvoiceNumber("INV-{SEQ}", 2026, 0)).toThrow();
  });

  it.each([
    ["2026-01-31", "monthly", "2026-02-28"],
    ["2024-01-31", "monthly", "2024-02-29"],
    ["2026-11-30", "quarterly", "2027-02-28"],
    ["2024-02-29", "yearly", "2025-02-28"],
  ] as const)("advances %s %s", (date, frequency, expected) => {
    expect(nextRecurringInvoiceDate(date, frequency)).toBe(expected);
  });
});
