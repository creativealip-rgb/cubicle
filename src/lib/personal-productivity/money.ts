const ISO_CURRENCIES = new Set([
  "IDR",
  "USD",
  "EUR",
  "GBP",
  "SGD",
  "MYR",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "CNY",
  "HKD",
  "INR",
  "KRW",
  "NZD",
  "THB",
  "PHP",
  "VND",
]);
const ZERO = BigInt(0),
  HUNDRED = BigInt(100);
export type BudgetBucket = "needs" | "wants" | "savings" | "unbudgeted";
export function assertIsoCurrency(value: string) {
  const code = value.trim().toUpperCase();
  if (!ISO_CURRENCIES.has(code)) throw new Error("Unsupported currency");
  return code;
}
function cents(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * HUNDRED + BigInt((fraction + "00").slice(0, 2));
}
function amount(value: bigint) {
  const sign = value < ZERO ? "-" : "";
  const absolute = value < ZERO ? -value : value;
  return `${sign}${absolute / HUNDRED}.${String(absolute % HUNDRED).padStart(2, "0")}`;
}
export function budgetProgress(actual: string, target: string) {
  const actualCents = cents(actual), targetCents = cents(target);
  return {
    percent: targetCents > ZERO ? Number((actualCents * BigInt(100)) / targetCents > BigInt(100) ? BigInt(100) : (actualCents * BigInt(100)) / targetCents) : 0,
    remaining: amount(targetCents - actualCents),
    over: actualCents > targetCents,
  };
}
export function summarizeBudget(
  rows: {
    type: "expense" | "allocation";
    bucket: BudgetBucket;
    amount: string;
  }[],
) {
  const totals = { needs: ZERO, wants: ZERO, savings: ZERO, unbudgeted: ZERO };
  for (const row of rows) totals[row.bucket] += cents(row.amount);
  return {
    needs: amount(totals.needs),
    wants: amount(totals.wants),
    savings: amount(totals.savings),
    unbudgeted: amount(totals.unbudgeted),
    spending: amount(totals.needs + totals.wants + totals.unbudgeted),
  };
}
