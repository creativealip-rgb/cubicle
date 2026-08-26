import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice English localization wiring", () => {
  it("localizes create and detail actions", () => {
    const form = read("src/components/forms/invoice-form.tsx");
    const item = read("src/app/(app)/app/invoices/[invoiceId]/add-item-button.tsx");
    const payment = read("src/app/(app)/app/invoices/[invoiceId]/payment-section.tsx");
    const share = read("src/app/(app)/app/invoices/[invoiceId]/share-token-section.tsx");
    expect(form).toContain('t("Tanggal Terbit *", "Issue Date *")');
    expect(form).toContain('t("Buat Invoice", "Create Invoice")');
    expect(item).toContain('t("Tambah Item", "Add Item")');
    expect(payment).toContain('t("Catat Pembayaran", "Record Payment")');
    expect(payment).toContain('t("Sisa", "Remaining")');
    expect(share).toContain('t("Cabut", "Revoke")');
    expect(share).toContain('t("Lihat Invoice", "View Invoice")');
    expect(share).toContain('className="flex flex-wrap gap-2"');
  });

  it("formats invoice dates with active locale", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");
    expect(page).toContain('const locale = lang === "en" ? "en-US" : "id-ID"');
    expect(page).not.toContain("formatDateID(inv.issueDate)");
  });
});
