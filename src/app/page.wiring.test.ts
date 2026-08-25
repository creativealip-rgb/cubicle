import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const pageSource = readFileSync("src/app/page.tsx", "utf8");

describe("landing regional wiring", () => {
  it("keeps visitor currency and language resolution at page boundary", () => {
    expect(pageSource).toContain("getCountryFromHeaders(requestHeaders)");
    expect(pageSource).toContain("resolveVisitorPreferences({");
    expect(pageSource).toContain("currencyCookie: cookieStore.get(\"cubiqlo_currency\")?.value");
    expect(pageSource).toContain("getCurrentLang(preferences.lang)");
    expect(pageSource).toContain("getLandingPrice(plan.name.toLowerCase() as");
    expect(pageSource).toContain('"monthly", currency');
    expect(pageSource).toContain('"yearly", currency');
    expect(pageSource).toContain("Payment processed in IDR.");
    expect(pageSource).toContain("Pembayaran diproses dalam IDR.");
    expect(pageSource).not.toContain("Indonesia");
  });
});

export {};
