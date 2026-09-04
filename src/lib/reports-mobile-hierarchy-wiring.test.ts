import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/app/(app)/app/reports/page.tsx"), "utf8");

describe("reports mobile hierarchy", () => {
  it("uses a compact responsive 4-KPI grid across devices", () => {
    expect(source).toContain('className="grid grid-cols-2 gap-3 md:grid-cols-4"');
    expect(source).toContain('className="rounded-xl border shadow-none bg-card p-4 space-y-1 transition-all"');
  });

  it("handles delta comparisons cleanly", () => {
    expect(source).toContain('deltaText(item.value, item.previous, lang)');
  });

  it("includes smart insights and trend charts", () => {
    expect(source).toContain('IncomeExpenseChart');
    expect(source).toContain('topClients');
    expect(source).toContain('topCategories');
  });
});
