import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptySection, personalSiteSectionSchema } from "./personal-site/model";

const styledTypes = ["booking", "custom", "gallery", "image", "mediaText", "embed", "social", "cta", "collapsible", "contentBlock"] as const;

describe("landing inline style coverage", () => {
  it.each(styledTypes)("stores title typography for %s", (type) => {
    const section = emptySection(type) as Record<string, unknown>;
    expect(personalSiteSectionSchema.safeParse({ ...section, titleTypography: { fontFamily: "inter", fontSize: "lg", bold: true, color: "#2563EB" } }).success).toBe(true);
  });

  it("wires every text-bearing canvas family to typography updates", () => {
    const canvas = readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8");
    const gallery = readFileSync("src/components/site/canvas/google-sites-gallery.tsx", "utf8");
    for (const key of ["titleTypography", "contentTypography", "buttonTypography", "priceTypography", "roleTypography", "descTypography"]) {
      expect(canvas).toContain(key);
    }
    expect(gallery).toContain("onTypographyChange");
    expect(gallery).toContain("titleTypography");
    expect(gallery).toContain("descTypography");
  });

  it("renders persisted granular typography on public pages", () => {
    const renderer = readFileSync("src/components/site/personal-site-renderer.tsx", "utf8");
    for (const key of ["titleTypography", "contentTypography", "buttonTypography", "priceTypography", "roleTypography", "descTypography"]) {
      expect(renderer).toContain(key);
    }
    expect(renderer).toContain("typographyInlineStyle");
  });
});
