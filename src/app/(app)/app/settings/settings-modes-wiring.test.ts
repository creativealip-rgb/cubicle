import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("settings mode wiring", () => {
  it("keeps branding by mode and FX in Invoice", () => {
    const source = readFileSync(join(process.cwd(), "src/app/(app)/app/settings/page.tsx"), "utf8");
    const workspace = source.indexOf('section="workspace"');
    const invoice = source.indexOf('section="invoice"');
    expect(workspace).toBeGreaterThan(-1);
    expect(invoice).toBeGreaterThan(workspace);
    expect(source.indexOf("<CurrencyRatesForm", invoice)).toBeGreaterThan(invoice);
    expect(source).not.toContain("BookingSlugForm");
    expect(source).not.toContain("BookingSlug");
  });
});
