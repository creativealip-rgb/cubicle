import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("auth and recurring QA wiring", () => {
  it("localizes auth accessibility labels", () => {
    const shell = read("src/components/auth/auth-shell.tsx");
    const password = read("src/components/ui/password-input.tsx");
    expect(shell).toContain('t("Kembali ke beranda Cubiqlo", "Back to Cubiqlo home")');
    expect(password).toContain('t("Tampilkan password", "Show password")');
    expect(password).toContain('t("Sembunyikan password", "Hide password")');
  });

  it("reports recurring delete success after server action", () => {
    const manager = read("src/components/invoices/recurring-invoice-manager.tsx");
    expect(manager).toContain("await deleteRecurringInvoiceRule(ruleId)");
    expect(manager).toContain("setDeleteId(rule.id)");
    expect(manager).toContain('t("Hapus invoice berulang?", "Delete recurring invoice?")');
    expect(manager).not.toContain("window.confirm");
    expect(manager).toContain('t("Invoice berulang dihapus", "Recurring invoice deleted")');
  });
});
