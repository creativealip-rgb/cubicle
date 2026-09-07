import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("personal planning route", () => {
  it("adds owner-only Planning in exact Personal order", () => {
    const nav = read("src/lib/navigation/app-navigation.ts");
    expect(nav).toMatch(/direct\("notes"[\s\S]*direct\("productivity"[\s\S]*direct\("planning"[\s\S]*direct\("journal"/);
    expect(nav).toMatch(/direct\("planning", "\/app\/planning"[\s\S]{0,250}true\)/);
  });

  it("renders budget and report tabs on Planning", () => {
    const page = read("src/app/(app)/app/planning/page.tsx");
    expect(page).toContain("PersonalExpensesSection");
    expect(page).toContain("PersonalReportSection");
    expect(page).toContain('tab === "report"');
  });

  it("redirects old personal finance scopes before workspace loading", () => {
    for (const path of ["src/app/(app)/app/expenses/page.tsx", "src/app/(app)/app/reports/page.tsx"]) {
      const source = read(path);
      expect(source).toContain('redirect(`/app/planning?');
      expect(source.indexOf('redirect(`/app/planning?')).toBeLessThan(source.indexOf("getWorkspaceFullForCurrentUser()"));
    }
  });
});
