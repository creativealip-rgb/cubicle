import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/actions/invoices.ts", "utf8");
const section = readFileSync("src/app/(app)/app/invoices/[invoiceId]/payment-section.tsx", "utf8");

describe("invoice payment actions", () => {
  it("marks remaining balance paid atomically", () => {
    const body = actions.slice(actions.indexOf("export async function markInvoiceAsPaid"));
    expect(body).toContain('.for("update")');
    expect(body).toContain("coalesce(sum(${payments.amount})");
    expect(body).toContain('method: "manual"');
    expect(body).toContain('status: "paid"');
  });

  it("reconciles invoice status after a partial payment", () => {
    const body = actions.slice(actions.indexOf("export async function recordPayment"), actions.indexOf("// ─── Send"));
    expect(body).toContain("reconcileInvoicePaymentState");
    expect(body).toContain("tx.update(invoices)");
  });

  it("exposes separate full and partial payment actions", () => {
    expect(section).toContain("markInvoiceAsPaid");
    expect(section).toContain('t("Tandai Lunas", "Mark as Paid")');
    expect(section).toContain('t("Catat Pembayaran Sebagian", "Record Partial Payment")');
  });
});
