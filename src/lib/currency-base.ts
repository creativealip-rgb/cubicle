/** Workspace base-currency helpers (manual FX rates). */

export type RateMap = Record<string, number>;

export type CurrencyAmount = {
  amount: number;
  currency: string;
};

export function normalizeCurrency(code: string | null | undefined, fallback = "IDR"): string {
  const c = (code || fallback).trim().toUpperCase();
  return c || fallback;
}

/** Build map: fromCurrency → rate where 1 from = rate × base. */
export function buildRateMap(
  rows: Array<{ fromCurrency: string; rate: string | number }>,
): RateMap {
  const map: RateMap = {};
  for (const row of rows) {
    const from = normalizeCurrency(row.fromCurrency);
    const rate = typeof row.rate === "string" ? Number(row.rate) : row.rate;
    if (from && Number.isFinite(rate) && rate > 0) {
      map[from] = rate;
    }
  }
  return map;
}

/**
 * Convert amount to base currency.
 * Returns null if currency differs from base and rate missing/invalid.
 */
export function convertToBase(
  amount: number,
  currency: string,
  baseCurrency: string,
  rates: RateMap,
): number | null {
  if (!Number.isFinite(amount)) return null;
  const from = normalizeCurrency(currency);
  const base = normalizeCurrency(baseCurrency);
  if (from === base) return amount;
  const rate = rates[from];
  if (!rate || !Number.isFinite(rate) || rate <= 0) return null;
  return amount * rate;
}

export type AggregateToBaseResult = {
  total: number;
  convertedCount: number;
  skippedCount: number;
  missingCurrencies: string[];
  byCurrency: Record<string, number>;
};

/** Sum amounts into base currency. Missing rates are skipped (not guessed). */
export function aggregateToBase(
  rows: CurrencyAmount[],
  baseCurrency: string,
  rates: RateMap,
): AggregateToBaseResult {
  const base = normalizeCurrency(baseCurrency);
  let total = 0;
  let convertedCount = 0;
  let skippedCount = 0;
  const missing = new Set<string>();
  const byCurrency: Record<string, number> = {};

  for (const row of rows) {
    const from = normalizeCurrency(row.currency);
    const amt = Number(row.amount) || 0;
    byCurrency[from] = (byCurrency[from] || 0) + amt;
    const converted = convertToBase(amt, from, base, rates);
    if (converted === null) {
      skippedCount += 1;
      if (from !== base) missing.add(from);
      continue;
    }
    total += converted;
    convertedCount += 1;
  }

  return {
    total,
    convertedCount,
    skippedCount,
    missingCurrencies: Array.from(missing).sort(),
    byCurrency,
  };
}

/** Group rows by key after converting each amount to base. */
export function groupSumToBase<T extends CurrencyAmount & { key: string }>(
  rows: T[],
  baseCurrency: string,
  rates: RateMap,
): { groups: Array<{ key: string; total: number }>; missingCurrencies: string[] } {
  const base = normalizeCurrency(baseCurrency);
  const map = new Map<string, number>();
  const missing = new Set<string>();

  for (const row of rows) {
    const converted = convertToBase(Number(row.amount) || 0, row.currency, base, rates);
    if (converted === null) {
      const from = normalizeCurrency(row.currency);
      if (from !== base) missing.add(from);
      continue;
    }
    map.set(row.key, (map.get(row.key) || 0) + converted);
  }

  const groups = Array.from(map.entries())
    .map(([key, total]) => ({ key, total }))
    .sort((a, b) => b.total - a.total);

  return { groups, missingCurrencies: Array.from(missing).sort() };
}
