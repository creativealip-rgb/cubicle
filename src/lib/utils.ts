import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Currency ───
// Per-workspace currency. Pass a 3-letter ISO 4217 code (e.g. "IDR", "USD", "EUR").
// Returns a localized money string with the right symbol/precision.
//
// Default: IDR (Cubiqlo's primary market is Indonesia).
const LOCALE_FOR_CURRENCY: Record<string, string> = {
  IDR: "id-ID",
  USD: "en-US",
  EUR: "de-DE",
  JPY: "ja-JP",
  SGD: "en-SG",
  MYR: "ms-MY",
  AUD: "en-AU",
  GBP: "en-GB",
};

const SYMBOL_PREFIX: Record<string, string> = {
  IDR: "Rp",
  USD: "$",
  EUR: "€",
  JPY: "¥",
  SGD: "S$",
  MYR: "RM",
  AUD: "A$",
  GBP: "£",
};

// Currencies with no fractional units
const ZERO_DECIMAL = new Set(["IDR", "JPY"]);

/**
 * Format an amount (number or numeric string) as currency.
 * Examples:
 *   formatMoney(1500000)            → "Rp 1.500.000" (IDR default)
 *   formatMoney(1500.5, "USD")      → "$1,500.50"
 *   formatMoney(1500, "IDR")        → "Rp 1.500"
 *   formatMoney(1500, "JPY")        → "¥1,500"
 *   formatMoney(null)               → "—"
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currencyCode: string = "IDR",
  opts: { showSymbol?: boolean; decimals?: number } = {}
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!isFinite(num)) return "—";

  const code = (currencyCode || "IDR").toUpperCase();
  const locale = LOCALE_FOR_CURRENCY[code] ?? "en-US";
  const showSymbol = opts.showSymbol !== false;
  const decimals =
    opts.decimals !== undefined
      ? opts.decimals
      : ZERO_DECIMAL.has(code)
      ? 0
      : 2;

  // Use Intl for proper locale-aware grouping
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  } catch {
    formatted = num.toFixed(decimals);
  }

  if (!showSymbol) return formatted;
  const symbol = SYMBOL_PREFIX[code] ?? `${code} `;
  // IDR style: symbol prefix with space. EUR/JPY: symbol prefix tight. USD: symbol prefix tight.
  const tight = new Set(["USD", "EUR", "JPY", "GBP", "SGD", "AUD", "MYR"]);
  return tight.has(code) ? `${symbol}${formatted}` : `${symbol} ${formatted}`;
}

/** Compact money for KPI tiles: "Rp 1.5M" style. */
export function formatMoneyCompact(
  amount: number | string | null | undefined,
  currencyCode: string = "IDR"
): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "string" ? Number(amount) : amount;
  if (!isFinite(num)) return "—";
  const code = (currencyCode || "IDR").toUpperCase();
  const symbol = SYMBOL_PREFIX[code] ?? `${code} `;
  const tight = new Set(["USD", "EUR", "JPY", "GBP", "SGD", "AUD", "MYR"]);
  const prefix = tight.has(code) ? symbol : `${symbol} `;
  const abs = Math.abs(num);
  let s: string;
  if (abs >= 1_000_000_000) s = (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  else if (abs >= 1_000_000) s = (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  else if (abs >= 1_000) s = (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  else s = String(num);
  return `${prefix}${s}`;
}
