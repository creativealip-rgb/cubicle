const ALLOWED_TOKENS = new Set(["YYYY", "SEQ"]);

export function validateRecurringInvoiceNumberPattern(pattern: string): string {
  const normalized = pattern.trim().toUpperCase();
  if (!normalized || normalized.length > 50) throw new Error("Pola nomor wajib diisi dan maksimal 50 karakter / Number pattern is required and must be at most 50 characters");
  const tokens = Array.from(normalized.matchAll(/\{([^}]+)\}/g), (match) => match[1]);
  if (tokens.some((token) => !ALLOWED_TOKENS.has(token))) throw new Error("Pola hanya mendukung {YYYY} dan {SEQ} / Pattern only supports {YYYY} and {SEQ}");
  if (tokens.filter((token) => token === "SEQ").length !== 1) throw new Error("Pola wajib memiliki tepat satu {SEQ} / Pattern must contain exactly one {SEQ}");
  if (tokens.filter((token) => token === "YYYY").length > 1) throw new Error("{YYYY} hanya boleh dipakai sekali / {YYYY} may only be used once");
  const remainder = normalized.replace(/\{(?:YYYY|SEQ)\}/g, "");
  if (remainder.includes("{") || remainder.includes("}")) throw new Error("Token pola tidak valid / Invalid pattern token");
  return normalized;
}

export function renderRecurringInvoiceNumber(pattern: string, year: number, sequence: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) throw new Error("Invalid year");
  if (!Number.isInteger(sequence) || sequence < 1) throw new Error("Invalid sequence");
  return validateRecurringInvoiceNumberPattern(pattern)
    .replace("{YYYY}", String(year))
    .replace("{SEQ}", String(sequence).padStart(4, "0"));
}

export function nextRecurringInvoiceDate(date: string, frequency: "monthly" | "quarterly" | "yearly"): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) throw new Error("Invalid date");
  const monthDelta = frequency === "monthly" ? 1 : frequency === "quarterly" ? 3 : 12;
  const targetMonth = month - 1 + monthDelta;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}
