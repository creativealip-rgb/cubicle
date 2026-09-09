import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const actions = readFileSync("src/lib/actions/invoices.ts", "utf8");
const dialog = readFileSync("src/components/invoices/invoice-create-dialog.tsx", "utf8");

describe("simple global invoice creation", () => {
  it("creates an empty draft with workspace defaults", () => {
    expect(actions).toContain("export async function createEmptyInvoiceDraft");
    expect(actions).toContain("createEmptyInvoiceDraftSchema");
    expect(actions).toContain('status: "draft"');
    expect(actions).toContain('subtotal: "0"');
    expect(actions).toContain("defaultInvoiceTerms");
  });

  it("renders only invoice number and searchable client selector", () => {
    expect(dialog).toContain("createEmptyInvoiceDraft");
    expect(dialog).toContain('name="invoiceNumber"');
    expect(dialog).toContain('name="clientId"');
    expect(dialog).toContain('role="listbox"');
    expect(dialog).toContain('role="combobox"');
    expect(dialog).toContain("filteredClients");
    expect(dialog).not.toContain("<InvoiceForm");
    expect(dialog).not.toContain("projects");
    expect(dialog).not.toContain("currencyRates");
  });
});
