import { describe, expect, it } from "vitest";
import { mergeUnifiedExpenses, type UnifiedExpense } from "./unified-expenses";
const row = (
  id: string,
  source: UnifiedExpense["source"],
  date: string,
  createdAt: string,
): UnifiedExpense => ({
  id,
  source,
  date,
  createdAt: new Date(createdAt),
  description: id,
  amount: "1",
  currency: "IDR",
});
describe("unified expense ordering", () => {
  it("orders date, createdAt, personal source rank, id descending", () => {
    const rows = mergeUnifiedExpenses(
      [row("a", "personal", "2026-09-01", "2026-09-01T00:00:00Z")],
      [row("z", "business", "2026-09-01", "2026-09-01T00:00:00Z")],
    ).rows;
    expect(rows.map((x) => x.source)).toEqual(["personal", "business"]);
  });
  it("uses exclusive cursor without duplicate or skipped old rows", () => {
    const all = [
      row("3", "personal", "2026-09-03", "2026-09-03T00:00:00Z"),
      row("2", "personal", "2026-09-02", "2026-09-02T00:00:00Z"),
      row("1", "personal", "2026-09-01", "2026-09-01T00:00:00Z"),
    ];
    const first = mergeUnifiedExpenses(all, [], 2);
    const second = mergeUnifiedExpenses(all, [], 2, first.cursor!);
    expect([...first.rows, ...second.rows].map((x) => x.id)).toEqual([
      "3",
      "2",
      "1",
    ]);
  });
});
