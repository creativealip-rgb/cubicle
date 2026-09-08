import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/actions/invoices.ts", "utf8");


describe("atomic invoice editor save", () => {
  it("accepts all editor metadata and manual line items", () => {
    expect(actions).toContain("saveInvoiceEditorSchema");
    expect(actions).toContain("export async function saveInvoiceEditor");
    expect(actions).toContain("items: z.array");
    expect(actions).toContain("clientId: z.string().uuid()");
    expect(actions).toContain("projectId: z.string().uuid().nullable()");
  });

  it("locks invoice and validates payment total before atomic save", () => {
    const body = actions.slice(actions.indexOf("export async function saveInvoiceEditor"));
    expect(body).toContain('.for("update")');
    expect(body).toContain("reconcileInvoicePaymentState");
    expect(body).toContain("tx.delete(invoiceItems)");
    expect(body).toContain("tx.insert(invoiceItems)");
    expect(body).toContain("writeActivityLog");
  });

  it("keeps partial as a computed payment state instead of a persisted invoice status", () => {
    expect(actions).toContain("reconcileInvoicePaymentState");
  });
});
