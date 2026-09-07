import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("personal finance cutover", () => {
  it("keeps personal components only on Planning", () => {
    expect(read("src/app/(app)/app/planning/page.tsx")).toContain("PersonalExpensesSection");
    expect(read("src/app/(app)/app/planning/page.tsx")).toContain("PersonalReportSection");
    expect(read("src/app/(app)/app/expenses/page.tsx")).not.toContain("PersonalExpensesSection");
    expect(read("src/app/(app)/app/reports/page.tsx")).not.toContain("PersonalReportSection");
  });

  it("does not render personal scope switchers in Finance", () => {
    expect(read("src/app/(app)/app/expenses/page.tsx")).not.toContain("👤 Pribadi (50/30/20)");
    expect(read("src/app/(app)/app/reports/page.tsx")).not.toContain("👤 Pribadi (50/30/20)");
  });
});
