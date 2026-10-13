import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("personal site block library and CTA", () => {
  it("uses sidebar drag-drop without canvas Add Section or Social primitive", () => {
    const editor = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
    const canvas = readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8");
    expect(editor).not.toContain('{ type: "social", label: "Sosial"');
    expect(editor).toContain("function DraggableWidgetButton");
    expect(editor).toContain('data: { type: "template", template');
    expect(editor).not.toContain('over.id.startsWith("s_")');
    expect(canvas).not.toContain('t("Tambah Bagian", "Add Section")');
  });

  it("exposes complete CTA fields and link target", () => {
    const properties = readFileSync("src/components/site/canvas/properties-panel.tsx", "utf8");
    const renderer = readFileSync("src/components/site/personal-site-renderer.tsx", "utf8");
    for (const field of ["section.text", "section.buttonLabel", "section.buttonUrl", "section.buttonTarget"]) expect(properties).toContain(field);
    expect(renderer).toContain('section.buttonTarget === "blank"');
    expect(readFileSync("src/components/site/canvas/canvas-renderer.tsx", "utf8")).toContain("value={section.heading}");
  });
});
