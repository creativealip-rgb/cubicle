import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  "src/app/client-portal/[token]/page.tsx",
  "utf8",
);

describe("client portal KPI strip", () => {
  it("shows five compact client-focused KPIs", () => {
    expect(source).toContain('t("Tugas Aktif", "Active Tasks")');
    expect(source).toContain('t("Butuh Review", "Needs Review")');
    expect(source).toContain('t("Proyek", "Projects")');
    expect(source).toContain('t("Invoice Terbuka", "Open Invoices")');
    expect(source).toContain('t("Permintaan", "Requests")');
  });

  it("summarizes fixed and hourly projects without retainer", () => {
    expect(source).not.toContain('t("Retainer", "Retainer")');
    expect(source).not.toContain('t("Harga Tetap", "Fixed Price")');
    expect(source).not.toContain('t("Per Jam", "Hourly")');
    expect(source).toContain("{byProjectCount} Fixed · {byHoursCount} Hourly");
  });

  it("uses one desktop row and horizontal mobile overflow", () => {
    expect(source).toContain("grid min-w-[760px] grid-cols-5 gap-3");
    expect(source).toContain("overflow-x-auto");
  });
});
