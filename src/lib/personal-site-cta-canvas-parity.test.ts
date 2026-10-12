import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CTA canvas parity", () => {
  it("has one CTA renderer and exposes its heading inline", () => {
    const source = readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8");
    expect(source.match(/case "cta":/g)).toHaveLength(1);
    const cta = source.slice(source.indexOf('case "cta":'), source.indexOf('case "contentBlock":'));
    expect(cta).toContain("value={section.heading}");
    expect(cta).toContain("value={section.text}");
    expect(cta).toContain("typography={section.titleTypography}");
    expect(cta).toContain("typography={section.contentTypography}");
    expect(cta).not.toContain("className={headingStyle.className}");
    expect(cta).not.toContain('section.buttonLabel || "Click Here"');
  });
});
