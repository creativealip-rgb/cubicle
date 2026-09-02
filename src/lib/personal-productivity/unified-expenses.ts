export type UnifiedExpense = {
  id: string;
  source: "personal" | "business";
  date: string;
  createdAt: Date;
  description: string;
  amount: string;
  currency: string;
};
export type ExpenseCursor = {
  date: string;
  createdAt: string;
  sourceRank: number;
  id: string;
};
const rank = (source: UnifiedExpense["source"]) =>
  source === "personal" ? 1 : 0;
export function encodeExpenseCursor(cursor: ExpenseCursor) {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}
export function decodeExpenseCursor(value?: string) {
  if (!value) return undefined;
  try {
    const cursor = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as ExpenseCursor;
    if (
      typeof cursor.date !== "string" ||
      typeof cursor.createdAt !== "string" ||
      ![0, 1].includes(cursor.sourceRank) ||
      typeof cursor.id !== "string" ||
      Number.isNaN(Date.parse(cursor.createdAt))
    ) return undefined;
    return cursor;
  } catch {
    return undefined;
  }
}
export function compareUnifiedExpenses(a: UnifiedExpense, b: UnifiedExpense) {
  return (
    b.date.localeCompare(a.date) ||
    b.createdAt.getTime() - a.createdAt.getTime() ||
    rank(b.source) - rank(a.source) ||
    b.id.localeCompare(a.id)
  );
}
export function mergeUnifiedExpenses(
  personal: UnifiedExpense[],
  business: UnifiedExpense[],
  pageSize = 20,
  cursor?: ExpenseCursor,
) {
  const after = (row: UnifiedExpense) =>
    !cursor ||
    compareUnifiedExpenses(row, {
      id: cursor.id,
      source: cursor.sourceRank === 1 ? "personal" : "business",
      date: cursor.date,
      createdAt: new Date(cursor.createdAt),
      description: "",
      amount: "0",
      currency: "IDR",
    }) > 0;
  const rows = [
    ...personal.filter(after).slice(0, 100),
    ...business.filter(after).slice(0, 100),
  ]
    .sort(compareUnifiedExpenses)
    .slice(0, pageSize);
  const last = rows.at(-1);
  return {
    rows,
    cursor: last
      ? {
          date: last.date,
          createdAt: last.createdAt.toISOString(),
          sourceRank: rank(last.source),
          id: last.id,
        }
      : null,
  };
}
// ponytail: bounded to 100 candidates per storage; replace with authorized SQL UNION ALL when measured volume or latency requires it.
