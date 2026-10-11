import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("src/app/page.tsx");
const layout = read("src/app/layout.tsx");
const sitemap = read("src/app/sitemap.ts");

describe("landing SEO and accessibility", () => {
  it("keeps public Open Graph metadata on cubiqlo.com with a preview image", () => {
    expect(layout).toContain('const siteUrl = "https://cubiqlo.com"');
    expect(layout).toContain("metadataBase: new URL(siteUrl)");
    expect(layout).toContain('url: siteUrl');
    expect(layout).toContain('images: [{ url: "/og-image.png"');
    expect(layout).toContain('images: ["/og-image.png"]');
  });

  it("publishes a sitemap for every public landing route", () => {
    expect(sitemap).toContain('["/", "/terms", "/privacy"]');
    expect(sitemap).toContain("url: `${SITE_URL}${path}`");
  });

  it("offsets in-page anchors below the fixed header", () => {
    for (const id of ["workflow", "portal", "compare", "pricing"]) {
      expect(page).toMatch(new RegExp(`id="${id}"[^>]*className="[^"]*scroll-mt-20`));
    }
  });

  it("labels navigation and comparison headers accessibly", () => {
    expect(page).toContain('menuLabel={tx("Buka menu", "Open menu")}');
    expect(page.match(/scope="col"/g)).toHaveLength(4);
    expect(page).toContain("<caption className=\"sr-only\"");
  });
});
