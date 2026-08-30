import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/page.tsx", "utf8");
const switcher = readFileSync("src/components/landing/landing-currency-switch.tsx", "utf8");

describe("landing currency UI", () => {
  it("keeps currency preference logic without rendering header toggle", () => {
    expect(page).toContain("resolveVisitorPreferences");
    expect(page).toContain("const currency: DisplayCurrency = preferences.currency");
    expect(page).not.toContain("<LandingCurrencySwitch");
    expect(switcher).toContain("fetch(\"/api/preferences\"");
  });

  it("formats decorative invoice badge with selected landing currency", () => {
    expect(page).toContain('getLandingInvoiceBadge(currency)');
    expect(page).not.toContain("Rp 8.500.000 ·");
  });

  it("does not show IDR processing notice in pricing", () => {
    expect(page).not.toContain("Payment processed in IDR");
    expect(page).not.toContain("Pembayaran diproses dalam IDR");
  });
});
