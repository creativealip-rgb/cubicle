import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("heavy export row limits", () => {
  it("bounds workspace-wide client exports", () => {
    expect(read("src/app/api/clients/export/xlsx/route.ts")).toContain(".limit(5001)");
    const pdf = read("src/app/api/clients/export/pdf/route.ts");
    expect(pdf).toContain(".limit(2001)");
    expect(pdf).toContain(".limit(10001)");
  });

  it("bounds every reports XLSX detail collection", () => {
    const source = read("src/app/api/reports/export/xlsx/route.ts");
    expect(source.match(/\.limit\(10001\)/g)).toHaveLength(4);
    expect(source).toContain("incomeRows.length + expenseRows.length > 10000");
    expect(source).toContain("aging.length + timeRows.length > 10000");
  });
});
