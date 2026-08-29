import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("recurring invoice UI", () => {
  it("renders management on invoice page", () => {
    const page = read("src/app/(app)/app/invoices/page.tsx");
    expect(page).toContain("<RecurringInvoiceManager");
    expect(page).toContain("recurringInvoiceRules.workspaceId");
  });

  it("keeps rule form in a drawer and renders compact rule management", () => {
    const manager = read("src/components/invoices/recurring-invoice-manager.tsx");
    const page = read("src/app/(app)/app/invoices/page.tsx");
    expect(manager).toContain("SheetContent");
    expect(manager).toContain('t("Invoice berulang baru", "New recurring invoice")');
    expect(manager).toContain('t("Belum ada invoice berulang", "No recurring invoices yet")');
    expect(manager).toContain('t("Buat draft sekarang", "Generate draft now")');
    expect(manager).toContain("createRecurringInvoiceRule");
    expect(manager).toContain("renderRecurringInvoiceNumber");
    expect(manager).toContain("updateRecurringInvoiceRule(editingId, payload)");
    expect(page).toContain("<InvoicesListTable");
    expect(page.indexOf("<InvoicesListTable")).toBeLessThan(page.indexOf("<RecurringInvoiceManager"));
    expect(manager).toContain("setEditingId(rule.id)");
    expect(manager).toContain('t("Simpan invoice berulang", "Save recurring invoice")');
    expect(manager).toContain("deleteRecurringInvoiceRule");
    expect(manager).toContain("INV-{YYYY}-{SEQ}");
  });
});
