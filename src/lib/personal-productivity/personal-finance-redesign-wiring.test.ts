import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("personal finance action dashboard", () => {
  it("uses consistent toolbar and dialogs matching expenses tab pattern", () => {
    const source = read("src/components/expenses/personal-expenses-section.tsx");
    expect(source).toContain('data-ui="personal-finance-actions"');
    expect(source).toContain("PersonalFinanceDialog");
    expect(source).toContain("Atur Budget");
    expect(source).toContain("Kategori");
  });

  it("renders transaction history in unified flat list style", () => {
    const source = read("src/components/expenses/personal-expenses-section.tsx");
    expect(source).toContain('data-ui="personal-finance-history"');
    expect(source).toContain("PersonalReceiptControl");
  });
});
