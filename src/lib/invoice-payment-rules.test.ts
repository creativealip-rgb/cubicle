import { describe, expect, it } from "vitest";
import { assertPaymentWithinRemaining, getInvoicePaymentState } from "./invoice-payment-rules";

describe("invoice payment rules", () => {
  it("accepts payment up to remaining balance", () => {
    expect(() => assertPaymentWithinRemaining(400_000, 1_000_000, 600_000)).not.toThrow();
  });

  it("rejects payment above remaining balance", () => {
    expect(() => assertPaymentWithinRemaining(400_001, 1_000_000, 600_000)).toThrow(
      "Pembayaran melebihi sisa invoice",
    );
  });

  it("rejects payment when invoice has no remaining balance", () => {
    expect(() => assertPaymentWithinRemaining(1, 1_000_000, 1_000_000)).toThrow(
      "Invoice sudah tidak memiliki sisa pembayaran",
    );
  });

  it("reports fully paid without changing manual invoice status", () => {
    expect(getInvoicePaymentState(1_000_000, 1_000_000)).toEqual({
      paid: 1_000_000,
      remaining: 0,
      fullyPaid: true,
    });
  });
});
