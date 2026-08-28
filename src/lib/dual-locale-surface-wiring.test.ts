import { expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

it("localizes destructive contract and invoice controls", () => {
  const deleteContract = read("src/components/contracts/delete-contract-button.tsx");
  const revokeContract = read("src/components/contracts/revoke-contract-button.tsx");
  const deleteItem = read("src/app/(app)/app/invoices/[invoiceId]/delete-item-button.tsx");
  const branding = read("src/components/settings/workspace-branding-form.tsx");
  expect(deleteContract).toContain('t("Kontrak dihapus", "Contract deleted")');
  expect(revokeContract).toContain('t("Kontrak dicabut", "Contract revoked")');
  expect(deleteItem).toContain('aria-label={t("Hapus item invoice", "Delete invoice item")}');
  expect(branding).toContain('placeholder={t("PT Contoh / Nama freelancermu", "Company or freelancer name")}');
});
