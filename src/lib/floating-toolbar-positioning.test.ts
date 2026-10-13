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

  it("keeps link popover open while its input receives focus", () => {
    const inline = readFileSync("src/components/site/canvas/inline-text.tsx", "utf8");
    const toolbar = readFileSync("src/components/site/canvas/floating-context-toolbar.tsx", "utf8");
    expect(inline).toContain("wrapper?.contains(document.activeElement)");
    expect(toolbar).toContain('onMouseDown={(e) => e.stopPropagation()}');
  });
});
