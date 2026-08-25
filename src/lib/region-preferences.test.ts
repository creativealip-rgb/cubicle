import { describe, expect, it } from "vitest";
import {
  countryToDefaults,
  getCountryFromHeaders,
  resolveVisitorPreferences,
} from "./region-preferences";

describe("countryToDefaults", () => {
  it("uses Indonesian defaults for ID, case-insensitive", () => {
    expect(countryToDefaults("id")).toEqual({ lang: "id", currency: "IDR" });
    expect(countryToDefaults(" ID ")).toEqual({ lang: "id", currency: "IDR" });
  });

  it("uses English/USD defaults for non-ID and missing countries", () => {
    expect(countryToDefaults("US")).toEqual({ lang: "en", currency: "USD" });
    expect(countryToDefaults(undefined)).toEqual({ lang: "en", currency: "USD" });
    expect(countryToDefaults(null)).toEqual({ lang: "en", currency: "USD" });
  });
});

describe("getCountryFromHeaders", () => {
  it("uses headers in cf, vercel, country-code precedence", () => {
    expect(getCountryFromHeaders(new Headers({
      "cf-ipcountry": "id",
      "x-vercel-ip-country": "US",
      "x-country-code": "GB",
    }))).toBe("id");
    expect(getCountryFromHeaders(new Headers({
      "x-vercel-ip-country": "id",
      "x-country-code": "US",
    }))).toBe("id");
    expect(getCountryFromHeaders(new Headers({ "x-country-code": "id" }))).toBe("id");
  });

  it("supports plain header records and missing headers", () => {
    expect(getCountryFromHeaders({ "x-country-code": "ID" })).toBe("ID");
    expect(getCountryFromHeaders(new Headers())).toBeUndefined();
  });
});

describe("resolveVisitorPreferences", () => {
  it("uses account language over valid cookie, then inferred language", () => {
    expect(resolveVisitorPreferences({ country: "ID", langCookie: "en" })).toEqual({ lang: "en", currency: "IDR" });
    expect(resolveVisitorPreferences({ country: "ID", langCookie: "bad" })).toEqual({ lang: "id", currency: "IDR" });
    expect(resolveVisitorPreferences({ country: "ID", accountLang: "en", langCookie: "id" })).toEqual({ lang: "en", currency: "IDR" });
  });

  it("accepts only valid cookie values and resolves currency independently", () => {
    expect(resolveVisitorPreferences({ country: "US", langCookie: "id", currencyCookie: "IDR" })).toEqual({ lang: "id", currency: "IDR" });
    expect(resolveVisitorPreferences({ country: "US", currencyCookie: "IDR" })).toEqual({ lang: "en", currency: "IDR" });
    expect(resolveVisitorPreferences({ country: "ID", currencyCookie: "EUR" })).toEqual({ lang: "id", currency: "IDR" });
  });
});
