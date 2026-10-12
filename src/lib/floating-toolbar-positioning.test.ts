import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("floating toolbar positioning", () => {
  it("stays hidden until its anchored position is measured", () => {
    const source = readFileSync("src/components/site/canvas/floating-context-toolbar.tsx", "utf8");
    expect(source).toContain("| null>(null)");
    expect(source).toContain('visibility: position ? "visible" : "hidden"');
    expect(source).not.toContain("animate-in fade-in zoom-in-95");
    expect(source).not.toContain("useState({ left: 12, top: 12, below: false })");
  });
});
