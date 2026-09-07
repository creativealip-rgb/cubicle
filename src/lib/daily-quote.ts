export function localDateInTimezone(now: Date, timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  }
}

export function parseDailyQuote(raw: string) {
  const value = raw.trim();
  if (!value || value.length > 280 || /[<>\u0000-\u001f\u007f]/.test(value)) throw new Error("Invalid quote");
  const [quote, attribution] = value.split(/\s+[—–-]\s+/, 2).map((part) => part.trim());
  if (!quote || quote.length > 240 || (attribution?.length ?? 0) > 60) throw new Error("Invalid quote");
  return { quote, attribution: attribution || null };
}

export const FALLBACK_QUOTES = {
  id: ["Langkah kecil hari ini membangun hidup yang besar. — Cubiqlo", "Kemajuan lahir dari keberanian untuk mulai. — Cubiqlo"],
  en: ["Small steps today build a bigger life. — Cubiqlo", "Progress begins with the courage to start. — Cubiqlo"],
} as const;

export function fallbackQuote(lang: "id" | "en", localDate: string) {
  const pool = FALLBACK_QUOTES[lang];
  const index = localDate.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % pool.length;
  return parseDailyQuote(pool[index]);
}
