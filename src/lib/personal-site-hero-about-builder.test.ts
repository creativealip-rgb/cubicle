import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("personal-site hero/about builder sections", () => {
  it("moves page templates to a header dialog", () => {
    const editor = read("src/components/site/canvas/canvas-editor.tsx");
    expect(editor).toContain('data-testid="page-templates-trigger"');
    expect(editor).toContain('data-testid="page-templates-dialog"');
    expect(editor.indexOf('data-testid="page-templates-trigger"')).toBeGreaterThan(editor.indexOf("<BuilderWorkflowHeader"));
    expect(editor.indexOf('t("Template Halaman", "Page Templates")')).toBeGreaterThan(editor.indexOf('data-testid="page-templates-dialog"'));
  });

  it("removes global typography and legacy hero/about settings controls", () => {
    const editor = read("src/components/site/canvas/canvas-editor.tsx");
    expect(editor).not.toContain('t("Font & Tipografi", "Typography & Fonts")');
    expect(editor).not.toContain('t("Font Judul (Heading)", "Heading Font")');
    expect(editor).not.toContain('t("Font Isi (Body)", "Body Font")');
    expect(editor).not.toContain('t("Hero Headline Utama", "Hero Headline")');
    expect(editor).not.toContain('t("Tentang Agensi / About Bio", "About Agency Bio")');
  });

  it("includes hero and about in section structure and inline canvas", () => {
    const model = read("src/lib/personal-site/model.ts");
    const canvas = read("src/components/site/canvas/canvas-renderer.tsx");
    expect(model).toContain('"hero",');
    expect(model).toContain('"about",');
    expect(canvas).toContain('case "hero"');
    expect(canvas).toContain('case "about"');
    expect(canvas).not.toContain("{/* Hero section */}");
    expect(canvas).not.toContain("{/* About */}");
  });
});
