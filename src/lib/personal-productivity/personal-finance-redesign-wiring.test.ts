import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("personal finance action dashboard", () => {
  it("uses a four-metric pulse and clear personal boundary", () => {
    const source = read("src/components/expenses/personal-expenses-section.tsx");
    expect(source).toContain('data-ui="personal-finance-kpis"');
    expect(source).toContain("Spent this month");
    expect(source).toContain("Remaining budget");
    expect(source).toContain("Savings allocated");
    expect(source).toContain("Top category");
    expect(source).toContain("separate from business expenses");
  });

  it("moves settings behind dialogs and keeps quick add primary", () => {
    const source = read("src/components/expenses/personal-expenses-section.tsx");
    expect(source).toContain("PersonalFinanceDialog");
    expect(source).toContain("Manage budget");
    expect(source).toContain("Manage categories");
    expect(source).toContain("More details");
    expect(source).toContain('data-ui="personal-quick-add"');
  });

  it("shows recent transactions before category settings", () => {
    const source = read("src/components/expenses/personal-expenses-section.tsx");
    expect(source.indexOf("Recent transactions")).toBeGreaterThan(-1);
    expect(source.indexOf("Manage categories")).toBeGreaterThan(source.indexOf("Recent transactions"));
  });
});
