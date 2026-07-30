import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("add project item to existing invoice", () => {
  it("loads eligible same-client fixed-price projects", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");
    expect(page).toContain("eligibleProjectItems");
    expect(page).toContain("eq(projects.clientId, inv.clientId)");
    expect(page).toContain("resolveFixedPriceInvoiceAmount");
    expect(page).toContain("projectOptions={eligibleProjectItems}");
  });

  it("validates and adds project items server-side", () => {
    const actions = read("src/lib/actions/invoices.ts");
    expect(actions).toContain("export async function addProjectInvoiceItem");
    expect(actions).toContain("Proyek tidak sesuai dengan klien invoice");
    expect(actions).toContain("Proyek ini sudah ada di invoice");
    expect(actions).toContain('sourceType: "project"');
    expect(actions).toContain("resolveFixedPriceInvoiceAmount");
    expect(actions).toContain("convertCurrency");
  });

  it("offers manual and project sources in dialog", () => {
    const form = read("src/app/(app)/app/invoices/[invoiceId]/add-item-button.tsx");
    expect(form).toContain("Dari Proyek Klien");
    expect(form).toContain("Manual");
    expect(form).toContain("addProjectInvoiceItem");
    expect(form).toContain("projectOptions");
  });
});
