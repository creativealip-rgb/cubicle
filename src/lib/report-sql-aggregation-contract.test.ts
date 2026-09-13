import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/app/(app)/app/reports/page.tsx", "utf8");

describe("financial report SQL aggregation contract", () => {
  it("aggregates totals and rankings before rows reach Node", () => {
    expect(source).toContain("incomeAggregateRows");
    expect(source).toContain("expenseAggregateRows");
    expect(source).toContain("FILTER (WHERE");
    expect(source).toContain("sum(${payments.amount})");
    expect(source).toContain("sum(${expenses.amount})");
    expect(source).not.toContain("allIncomeRows");
    expect(source).not.toContain("allExpenseRows");
  });

  it("uses SQL daily buckets and avoids repeated scans", () => {
    expect(source).toContain("incomeDailyRows");
    expect(source).toContain("expenseDailyRows");
    expect(source).toContain("date_trunc('day'");
    expect(source).toContain("groupIndexByDay");
    expect(source).toContain("AT TIME ZONE 'UTC'");
    expect(source).toContain("paymentEndExclusive");
    expect(source).toContain("comparisonPaymentEndExclusive");
    expect(source).not.toContain("groups.findIndex");
  });
});
