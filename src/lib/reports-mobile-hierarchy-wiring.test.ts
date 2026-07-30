import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/app/(app)/app/reports/page.tsx"), "utf8");

describe("reports mobile hierarchy", () => {
  it("uses a compact two-column KPI grid on phones", () => {
    expect(source).toContain('className="grid grid-cols-2 gap-3 md:grid-cols-3"');
    expect(source).toContain('className="p-4 sm:p-6"');
  });

  it("uses neutral zero-value styling and hides empty comparison noise", () => {
    expect(source).toContain('const hasValue = item.value !== 0');
    expect(source).toContain('hasValue ? item.tone : "text-slate-700"');
    expect(source).toContain('item.value !== 0 || item.previous !== 0');
  });

  it("keeps the net KPI full width on mobile", () => {
    expect(source).toContain('item.label === t("Bersih", "Net") ? "col-span-2 md:col-span-1" : undefined');
  });
});
