import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const studio = readFileSync("src/components/prompts/prompt-studio.tsx", "utf8");
const css = readFileSync("src/app/globals.css", "utf8");

describe("audit accessibility follow-ups", () => {
  it("keeps prompt section numbering contiguous when details are absent", () => {
    expect(studio).toContain("detailFields.length > 0 ? 3 : 2");
  });

  it("honors reduced motion globally", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: 0.01ms !important");
    expect(css).toContain("transition-duration: 0.01ms !important");
  });

  it("uses an AA destructive background with white text", () => {
    expect(css.match(/--destructive: #c2410c/gi)).toHaveLength(2);
  });
});
