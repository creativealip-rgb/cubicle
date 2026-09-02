import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/app/(app)/app/reports/page.tsx"), "utf8");

describe("reports mobile hierarchy", () => {
  it("uses a compact responsive 4-KPI grid across devices", () => {
    expect(source).toContain('className="grid grid-cols-2 gap-3 lg:grid-cols-4"');
    expect(source).toContain('className="p-4 flex flex-col justify-between h-full"');
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
