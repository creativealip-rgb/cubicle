import { normalizeCurrency } from "./currency-base";

export type ReportFxContract = {
  status: "complete" | "partial";
  baseCurrency: string;
  fxSnapshot: string;
  convertedTotal: number;
  originalTotalsByCurrency: Record<string, number>;
  missingFx: Array<{ currency: string; rowCount: number; originalTotal: number }>;
};

export function buildReportFxContract(input: {
  baseCurrency: string;
  fxSnapshot: string;
  rates: Record<string, number>;
  rows: Array<{ currency: string; amount: string | number }>;
}): ReportFxContract {
  const baseCurrency = normalizeCurrency(input.baseCurrency);
  const originalTotalsByCurrency: Record<string, number> = {};
  const missing = new Map<string, { rowCount: number; originalTotal: number }>();
  let convertedTotal = 0;
  for (const row of input.rows) {
    const currency = normalizeCurrency(row.currency);
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    originalTotalsByCurrency[currency] = (originalTotalsByCurrency[currency] ?? 0) + amount;
    const rate = currency === baseCurrency ? 1 : input.rates[currency];
    if (!Number.isFinite(rate) || rate <= 0) {
      const current = missing.get(currency) ?? { rowCount: 0, originalTotal: 0 };
      current.rowCount += 1;
      current.originalTotal += amount;
      missing.set(currency, current);
      continue;
    }
    convertedTotal += amount * rate;
  }
  const missingFx = Array.from(missing.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([currency, value]) => ({ currency, ...value }));
  return { status: missingFx.length ? "partial" : "complete", baseCurrency, fxSnapshot: input.fxSnapshot, convertedTotal, originalTotalsByCurrency: Object.fromEntries(Object.entries(originalTotalsByCurrency).sort(([a], [b]) => a.localeCompare(b))), missingFx };
}
