import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("per-page filter accessible names", () => {
  it("labels every task filter trigger", () => {
    const source = read("src/components/tasks/task-filters.tsx");
    expect(source).toContain('aria-label={t("Filter status tugas", "Filter task status")}');
    expect(source).toContain('aria-label={t("Filter prioritas tugas", "Filter task priority")}');
    expect(source).toContain('aria-label={t("Filter proyek tugas", "Filter task project")}');
    expect(source).toContain('aria-label={t("Filter petugas", "Filter assignee")}');
  });

  it("labels expense month category search and clear controls", () => {
    const source = read("src/components/expenses/expense-filters.tsx");
    expect(source).toContain('aria-label={t("Filter bulan pengeluaran", "Filter expense month")}');
    expect(source).toContain('aria-label={t("Filter kategori pengeluaran", "Filter expense category")}');
    expect(source).toContain('aria-label={t("Cari pengeluaran", "Search expenses")}');
    expect(source).toContain('aria-label={t("Reset filter", "Clear filters")}');
  });

  it("labels workspace search input", () => {
    const source = read("src/app/(app)/app/search/page.tsx");
    expect(source).toContain('aria-label={t("Cari workspace", "Search workspace")}');
  });
});
