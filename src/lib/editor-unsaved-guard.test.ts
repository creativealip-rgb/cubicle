import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const questionnaire = readFileSync("src/components/questionnaires/questionnaire-builder.tsx", "utf8");
const documents = readFileSync("src/components/documents/document-block-editor.tsx", "utf8");
const site = readFileSync("src/components/site/canvas/canvas-editor.tsx", "utf8");
const guard = readFileSync("src/lib/use-unsaved-changes.ts", "utf8");

describe("editor unsaved-change guards", () => {
  it("guards browser unload centrally", () => {
    expect(guard).toContain('window.addEventListener("beforeunload", warn)');
  });

  it("guards questionnaire cancel and browser unload", () => {
    expect(questionnaire).toContain("useUnsavedChanges(dirty && !pending)");
    expect(questionnaire).toContain("Unsaved changes. Leave editor?");
  });

  it("guards proposal and contract editor navigation while autosave is pending", () => {
    expect(documents).toContain("useUnsavedChanges(dirty || saving)");
    expect(documents).toContain("Changes are still saving. Leave editor?");
  });

  it("keeps personal site beforeunload protection", () => {
    expect(site).toContain('window.addEventListener("beforeunload", handleBeforeUnload)');
  });
});
