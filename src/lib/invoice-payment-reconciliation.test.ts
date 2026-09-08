import { describe, expect, it } from "vitest";
import { reconcileInvoicePaymentState } from "@/lib/invoice-payment-reconciliation";

describe("invoice payment reconciliation", () => {
  it("marks zero payment as unpaid while preserving workflow status", () => {
    expect(reconcileInvoicePaymentState({ total: 1000, paid: 0, workflowStatus: "sent" })).toEqual({ paymentState: "unpaid", status: "sent", remaining: 1000 });
  });

  it("marks a partial payment as partial", () => {
    expect(reconcileInvoicePaymentState({ total: 1000, paid: 400, workflowStatus: "sent" })).toEqual({ paymentState: "partial", status: "sent", remaining: 600 });
  });

  it("marks full payment as paid", () => {
    expect(reconcileInvoicePaymentState({ total: 1000, paid: 1000, workflowStatus: "sent" })).toEqual({ paymentState: "paid", status: "paid", remaining: 0 });
  });

  it("rejects overpayment after a total edit", () => {
    expect(() => reconcileInvoicePaymentState({ total: 800, paid: 1000, workflowStatus: "paid" })).toThrow("Recorded payments exceed invoice total");
  });
});
