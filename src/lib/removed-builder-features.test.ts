import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("removed builder features", () => {
  it("removes AI copy generator from personal-site properties", () => {
    const source = read("src/components/site/canvas/properties-panel.tsx");
    expect(source).not.toContain("AI Copy Generator");
    expect(source).not.toContain("generatePersonalSiteCopy");
    expect(source).not.toContain("handleGenerateCopy");
  });

  it("removes conditional logic from form schema, editor, and public intake", () => {
    for (const path of [
      "src/lib/questionnaire-schema.ts",
      "src/components/questionnaires/questionnaire-builder.tsx",
      "src/components/questionnaires/intake-form.tsx",
    ]) {
      const source = read(path);
      expect(source).not.toContain("Conditional Logic");
      expect(source).not.toContain("selectedField.condition");
      expect(source).not.toContain("f.condition");
    }
  });

  it("removes footer contact form from settings, model, and public renderer", () => {
    for (const path of [
      "src/components/site/canvas/canvas-editor.tsx",
      "src/components/site/personal-site-renderer.tsx",
      "src/lib/personal-site/model.ts",
    ]) {
      const source = read(path);
      expect(source).not.toContain("showContactForm");
      expect(source).not.toContain("contactFormHeading");
    }
  });
});
