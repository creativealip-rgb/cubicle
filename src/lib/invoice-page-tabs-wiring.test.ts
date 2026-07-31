import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const invoicePage = readFileSync("src/app/(app)/app/invoices/page.tsx", "utf8");
const reportsPage = readFileSync("src/app/(app)/app/reports/page.tsx", "utf8");

describe("invoice page tab cleanup", () => {
  it("does not render legacy three header tabs", () => {
    expect(invoicePage).not.toContain("Semua Invoice");
    expect(invoicePage).not.toContain("Belum Ditagihkan");
    expect(invoicePage).not.toContain("Sudah Ditagihkan");
    expect(invoicePage).not.toContain("tab=unbilled");
    expect(invoicePage).not.toContain("tab=billed");
  });

  it("keeps one canonical status filter surface", () => {
    const matches = invoicePage.match(/<StatusFilterTabs/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(invoicePage).toContain("activeValue={statusTab}");
    expect(invoicePage).toContain("params.set(\"status\", filters.status)");
  });

  it("does not link to unsupported invoice date query params", () => {
    expect(reportsPage).not.toContain("/app/invoices?from=");
    expect(reportsPage).not.toContain("/app/invoices?from=${period.start}&to=${period.end}");
  });

  it("removes top client/type filter form from invoice page", () => {
    expect(invoicePage).not.toContain("id=\"invoice-filter-client\"");
    expect(invoicePage).not.toContain("id=\"invoice-filter-billing\"");
    expect(invoicePage).not.toContain("name=\"clientId\"");
    expect(invoicePage).not.toContain("name=\"billing\"");
  });
});
