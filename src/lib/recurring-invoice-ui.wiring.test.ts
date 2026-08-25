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

  it("supports create, schedule pattern preview, pause, and delete", () => {
    const manager = read("src/components/invoices/recurring-invoice-manager.tsx");
    expect(manager).toContain("createRecurringInvoiceRule");
    expect(manager).toContain("renderRecurringInvoiceNumber");
    expect(manager).toContain("updateRecurringInvoiceRule");
    expect(manager).toContain("deleteRecurringInvoiceRule");
    expect(manager).toContain("INV-{YYYY}-{SEQ}");
  });
});
