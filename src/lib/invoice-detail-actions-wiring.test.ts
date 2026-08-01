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

  it("hides financial item mutation controls for final invoices", () => {
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");

    expect(page).toContain("isInvoiceFinancialsMutable(inv.status)");
    expect(page).toContain("Invoice final. Rincian item tidak dapat diubah.");
    expect(page).toContain("financialsMutable ? <DeleteItemButton");
  });

  it("persists an encrypted share token across refresh", () => {
    const schema = read("src/db/schema.ts");
    const actions = read("src/lib/actions/invoices.ts");
    const page = read("src/app/(app)/app/invoices/[invoiceId]/page.tsx");
    const share = read("src/app/(app)/app/invoices/[invoiceId]/share-token-section.tsx");
    const migration = read("drizzle/0063_invoice_share_token_encrypted.sql");

    expect(schema).toContain('sharedTokenEnc: text("shared_token_enc")');
    expect(migration).toContain('ADD COLUMN IF NOT EXISTS "shared_token_enc" text');
    expect(actions).toContain("sharedTokenEnc: encryptSecret(rawToken)");
    expect(actions).toContain("sharedTokenEnc: null");
    expect(page).toContain("decryptSecret(inv.sharedTokenEnc)");
    expect(page).toContain("initialToken={existingShareToken}");
    expect(share).toContain("initialToken: string | null");
    expect(share).toContain("useState<string | null>(initialToken)");
  });
});
