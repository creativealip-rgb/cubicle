import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/expenses/page.tsx", "utf8");

describe("expenses SQL pagination contract", () => {
  it("searches, counts, and paginates in PostgreSQL", () => {
    expect(source).toContain("escapeLikeLiteral");
    expect(source).toContain("ILIKE");
    expect(source).toContain("ESCAPE");
    expect(source).toContain("count(expenses.id)");
    expect(source).toContain(".limit(PAGE_SIZE)");
    expect(source).toContain(".offset((safePage - 1) * PAGE_SIZE)");
    expect(source).not.toContain(".limit(100)");
    expect(source).not.toContain("allForFilter.filter");
    expect(source).not.toContain("filtered.length");
    expect(source).not.toContain(".slice((safePage - 1) * PAGE_SIZE");
  });

  it("preserves tenant scope and deterministic ordering", () => {
    expect(source).toContain("eq(expenses.workspaceId, ws.id)");
    expect(source).toContain("desc(expenses.date), desc(expenses.createdAt), desc(expenses.id)");
  });
});
