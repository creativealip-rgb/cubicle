import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("invoice detail actions", () => {
  it("does not show a download action in the invoice edit header", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");

    expect(page).not.toContain('t("Unduh Invoice", "Download Invoice")');
    expect(page).not.toContain("/api/invoices/${invoiceId}/pdf");
  });

  it("restores the HTML shared-invoice view action", () => {
    const share = read("src/app/(app)/app/invoices/[invoiceId]/share-token-section.tsx");

    expect(share).toContain("function shareInvoiceUrl");
    expect(share).toContain("`${base}/invoice/${token}`");
    expect(share).toContain("Lihat Invoice");
    expect(share).toContain('target="_blank"');
  });
});
