import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/app/client-portal/[token]/page.tsx",
  "utf8",
);

describe("client portal KPI strip", () => {
  it("shows six client-focused KPIs with separate fixed and hourly cards", () => {
    expect(source).toContain('t("Tugas Aktif", "Active Tasks")');
    expect(source).toContain('t("Butuh Review", "Needs Review")');
    expect(source).toContain('t("Harga Tetap", "Fixed Price")');
    expect(source).toContain('t("Per Jam", "Hourly")');
    expect(source).toContain('t("Invoice Terbuka", "Open Invoices")');
    expect(source).toContain('t("Permintaan", "Requests")');
  });

  it("does not render retainer or a combined projects KPI", () => {
    expect(source).not.toContain('t("Retainer", "Retainer")');
    expect(source).not.toContain('t("Proyek", "Projects")');
    expect(source).not.toContain("Fixed ·");
  });

  it("uses a responsive 2-column mobile and 3-column desktop grid", () => {
    expect(source).toContain("grid grid-cols-2 gap-3 lg:grid-cols-3");
  });
});
