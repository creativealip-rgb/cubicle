import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("published hero alignment", () => {
  it("centers and right-aligns constrained hero blocks, not only their text", () => {
    const source = readFileSync("src/components/site/personal-site-renderer.tsx", "utf8");
    expect(source).toContain('align === "center" ? "mx-auto"');
    expect(source).toContain('align === "right" ? "ml-auto"');
    expect(source).toContain("alignedWidth(section.titleTypography?.align || section.align)");
    expect(source).toContain("alignedWidth(section.contentTypography?.align || section.align)");
  });
});
