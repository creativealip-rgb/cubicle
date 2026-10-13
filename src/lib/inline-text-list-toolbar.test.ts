import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inline text list and toolbar", () => {
  it("uses native editable lists so Enter creates a new list item", () => {
    const source = readFileSync("src/components/site/canvas/inline-text.tsx", "utf8");
    expect(source).toContain('const ListTag = listType === "bullet" ? "ul" : "ol"');
    expect(source).toContain("<li key=");
    expect(source).toContain('if (listType === "bullet" || listType === "number") return;');
    expect(source).not.toContain('listType === "bullet" && <span');
  });

  it("allows toolbar form controls to receive focus", () => {
    const source = readFileSync("src/components/site/canvas/floating-context-toolbar.tsx", "utf8");
    expect(source).toContain("e.target instanceof HTMLInputElement");
    expect(source).toContain("e.target instanceof HTMLSelectElement");
  });
});
