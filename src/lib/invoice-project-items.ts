import { normalizeCurrency, type RateMap } from "./currency-base";

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  baseCurrency: string,
  rates: RateMap,
): { amount: number; rate: number } | null {
  const from = normalizeCurrency(fromCurrency);
  const to = normalizeCurrency(toCurrency);
  const base = normalizeCurrency(baseCurrency);
  if (from === to) return { amount, rate: 1 };
  const fromToBase = from === base ? 1 : rates[from];
  const toToBase = to === base ? 1 : rates[to];
  if (!fromToBase || !toToBase || fromToBase <= 0 || toToBase <= 0) return null;
  const rate = fromToBase / toToBase;
  return { amount: amount * rate, rate };
}

export function resolveProjectAmount(project: {
  billingType: string;
  budget: number | null;
  rate: number | null;
  packagePrice: number | null;
}): number {
  if (project.billingType === "hours") return 0;
  if (project.billingType === "package") return project.packagePrice ?? project.budget ?? 0;
  return project.budget ?? 0;
}
