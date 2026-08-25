import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("August meeting revision contract", () => {
  it("keeps navigation and settings structure", () => {
    const nav = read("src/lib/navigation/app-navigation.ts");
    const settings = read("src/app/(app)/app/settings/page.tsx");
    expect(nav.indexOf('id: "work"')).toBeLessThan(nav.indexOf('id: "business"'));
    expect(nav).toContain('direct("files"');
    expect(nav).toContain('direct("questionnaires"');
    expect(settings).toContain('workspace={');
    expect(settings).toContain('invoice={');
    expect(settings).not.toContain("<BookingSlugForm");
  });

  it("wires proposed custom numbers for every invoice create surface", () => {
    const actions = read("src/lib/actions/invoices.ts");
    const form = read("src/components/forms/invoice-form.tsx");
    const retainer = read("src/components/invoices/retainer-project-invoice-actions.tsx");
    expect(actions).toContain("getProposedInvoiceNumber");
    expect(form).toContain("getProposedInvoiceNumber().then");
    expect(form).toContain("invoiceNumber: form.invoiceNumber || undefined");
    expect(retainer).toContain("invoiceNumber: requestedNumber");
  });

  it("keeps preview detail-only and contract number editable on create", () => {
    const invoiceDetail = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");
    const invoiceCreate = read("src/app/(app)/app/invoices/new/page.tsx");
    const contract = read("src/components/contracts/create-contract-button.tsx");
    expect(invoiceDetail).toContain("/api/invoices/${invoiceId}/pdf");
    expect(invoiceCreate).not.toContain("Invoice Preview");
    expect(contract).toContain("proposedContractNumber");
    expect(contract).toContain("contractNumber: contractNumber.trim()");
  });
});
