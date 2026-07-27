import { describe, expect, it } from "vitest";
import {
  assertInvoiceFinancialsMutable,
  calculateInvoiceTotals,
} from "./invoice-finance-rules";

describe("invoice finance rules", () => {
  it("calculates total from subtotal minus discount plus tax nominal", () => {
    expect(calculateInvoiceTotals(6_000_000, 250_000, 660_000)).toEqual({
      subtotal: 6_000_000,
      discount: 250_000,
      tax: 660_000,
      total: 6_410_000,
    });
  });

  it("caps discount at subtotal and keeps totals non-negative", () => {
    expect(calculateInvoiceTotals(100_000, 150_000, 0)).toEqual({
      subtotal: 100_000,
      discount: 100_000,
      tax: 0,
      total: 0,
    });
  });

  it.each(["paid", "cancelled", "archived"])(
    "rejects financial mutation for %s invoice",
    (status) => {
      expect(() => assertInvoiceFinancialsMutable(status)).toThrow(
        "Invoice final tidak dapat mengubah rincian finansial",
      );
    },
  );

  it.each(["draft", "sent", "viewed", "overdue"])(
    "allows financial mutation for %s invoice",
    (status) => {
      expect(() => assertInvoiceFinancialsMutable(status)).not.toThrow();
    },
  );
});
