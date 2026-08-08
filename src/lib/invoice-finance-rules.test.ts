import { describe, expect, it } from "vitest";
import {
  assertInvoiceFinancialsMutable,
  calculateInvoiceTotals,
  isInvoiceStatusTransitionAllowed,
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

  it.each(["sent", "viewed", "paid", "overdue", "cancelled", "archived"])(
    "rejects financial mutation for %s invoice",
    (status) => {
      expect(() => assertInvoiceFinancialsMutable(status)).toThrow(
        "Invoice final tidak dapat mengubah rincian finansial",
      );
    },
  );

  it.each([["draft"]])(
    "allows financial mutation for %s invoice",
    (status) => {
      expect(() => assertInvoiceFinancialsMutable(status)).not.toThrow();
    },
  );

  describe("invoice status transition guard", () => {
    const STATUSES = ["draft", "sent", "viewed", "paid", "overdue", "cancelled", "archived"] as const;

    it("allows same-status no-op saves", () => {
      for (const status of STATUSES) {
        expect(isInvoiceStatusTransitionAllowed(status, status)).toBe(true);
      }
    });

    it("allows draft to move forward (sent/viewed/paid/overdue/archived)", () => {
      expect(isInvoiceStatusTransitionAllowed("draft", "sent")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("draft", "viewed")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("draft", "paid")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("draft", "overdue")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("draft", "archived")).toBe(true);
    });

    it("allows sent/viewed/overdue invoices to be marked paid or archived", () => {
      expect(isInvoiceStatusTransitionAllowed("sent", "paid")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("sent", "archived")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("viewed", "paid")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("viewed", "archived")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("overdue", "paid")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("overdue", "archived")).toBe(true);
    });

    it("forbids leaving terminal paid/cancelled/archived states", () => {
      for (const terminal of ["paid", "cancelled", "archived"]) {
        for (const target of STATUSES) {
          if (target === terminal) continue;
          expect(isInvoiceStatusTransitionAllowed(terminal, target)).toBe(false);
        }
      }
    });

    it("forbids invalid backwards transitions", () => {
      expect(isInvoiceStatusTransitionAllowed("sent", "draft")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("viewed", "draft")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("viewed", "sent")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("overdue", "draft")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("overdue", "sent")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("overdue", "viewed")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("paid", "draft")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("paid", "sent")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("cancelled", "sent")).toBe(false);
      expect(isInvoiceStatusTransitionAllowed("archived", "paid")).toBe(false);
    });

    it("keeps draft -> cancelled delegated to cancelDraftInvoice (disallowed here)", () => {
      expect(isInvoiceStatusTransitionAllowed("draft", "cancelled")).toBe(false);
    });

    it("allows sent -> overdue and viewed -> overdue (cron/reminder path)", () => {
      expect(isInvoiceStatusTransitionAllowed("sent", "overdue")).toBe(true);
      expect(isInvoiceStatusTransitionAllowed("viewed", "overdue")).toBe(true);
    });
  });
});
