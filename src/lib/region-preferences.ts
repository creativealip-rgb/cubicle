export type Lang = "id" | "en";
export type DisplayCurrency = "IDR" | "USD";

export type VisitorPreferences = {
  lang: Lang;
  currency: DisplayCurrency;
};

export function countryToDefaults(country?: string | null): VisitorPreferences {
  return country?.trim().toLowerCase() === "id"
    ? { lang: "id", currency: "IDR" }
    : { lang: "en", currency: "USD" };
}

const countryHeaders = ["cf-ipcountry", "x-vercel-ip-country", "x-country-code"] as const;

type HeaderSource = { get(name: string): string | null } | Record<string, string | undefined>;

export function getCountryFromHeaders(headers: HeaderSource): string | undefined {
  for (const name of countryHeaders) {
    const value = typeof (headers as { get?: unknown }).get === "function"
      ? (headers as { get(name: string): string | null }).get(name)
      : Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];
    if (value?.trim()) return value;
  }
  return undefined;
}

export function resolveVisitorPreferences(input: {
  country?: string | null;
  langCookie?: string | null;
  currencyCookie?: string | null;
  accountLang?: string | null;
}): VisitorPreferences {
  const inferred = countryToDefaults(input.country);
  const accountLang = input.accountLang === "id" || input.accountLang === "en" ? input.accountLang : undefined;
  const cookieLang = input.langCookie === "id" || input.langCookie === "en" ? input.langCookie : undefined;
  const currency = input.currencyCookie === "IDR" || input.currencyCookie === "USD"
    ? input.currencyCookie
    : inferred.currency;

  return { lang: accountLang ?? cookieLang ?? inferred.lang, currency };
}
