import { describe, expect, it } from "vitest";
import { convertCurrency, resolveProjectAmount } from "./invoice-project-items";

const rates = { USD: 16200, SGD: 12500 };

describe("convertCurrency", () => {
  it("keeps same currency", () => expect(convertCurrency(100, "USD", "USD", "IDR", rates)).toEqual({ amount: 100, rate: 1 }));
  it("converts foreign to base", () => expect(convertCurrency(100, "USD", "IDR", "IDR", rates)).toEqual({ amount: 1620000, rate: 16200 }));
  it("converts base to foreign", () => expect(convertCurrency(1620000, "IDR", "USD", "IDR", rates)).toEqual({ amount: 100, rate: 1 / 16200 }));
  it("converts foreign to foreign through base", () => expect(convertCurrency(100, "USD", "SGD", "IDR", rates)).toEqual({ amount: 129.6, rate: 16200 / 12500 }));
  it("returns null when a rate is missing", () => expect(convertCurrency(100, "EUR", "IDR", "IDR", rates)).toBeNull());
});

describe("resolveProjectAmount", () => {
  it("uses project budget", () => expect(resolveProjectAmount({ billingType: "project", budget: 500, rate: null, packagePrice: null })).toBe(500));
  it("uses package price", () => expect(resolveProjectAmount({ billingType: "package", budget: 900, rate: null, packagePrice: 700 })).toBe(700));
  it("returns zero for hourly project", () => expect(resolveProjectAmount({ billingType: "hours", budget: 900, rate: 50, packagePrice: null })).toBe(0));
});
