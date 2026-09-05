import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const source = readFileSync("src/app/(app)/app/clients/[clientId]/page.tsx", "utf8");

describe("client detail two-column layout", () => {
  it("keeps client profile in the left column and work tabs in the right column", () => {
    expect(source).toMatch(/lg:grid-cols-\[\d+px_minmax\(0,1fr\)\]/);
    expect(source).toContain("<aside className=\"space-y-4 lg:sticky lg:top-20 lg:self-start\">");
    expect(source).toContain("<section className=\"min-w-0\">");
    expect(source.indexOf("<aside className=\"space-y-4 lg:sticky lg:top-20 lg:self-start\">")).toBeLessThan(source.indexOf("<ClientTabsNav"));
  });

  it("keeps core client info inside the profile column", () => {
    const profileStart = source.indexOf("<aside className=\"space-y-4 lg:sticky lg:top-20 lg:self-start\">");
    const profileEnd = source.indexOf("</aside>", profileStart);
    const profile = source.slice(profileStart, profileEnd);

    expect(source).toContain("Klien");
    expect(profile).toContain("Proyek Aktif");
    expect(profile).toContain("Invoice Belum Lunas");
    expect(profile).toContain("Catatan Internal");
    expect(source).toContain("ClientEditDialog");
  });
});
