import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const questionnaire = readFileSync("src/components/questionnaires/questionnaire-builder.tsx", "utf8");
const importDialog = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("mobile overflow regressions", () => {
  it("stacks questionnaire field controls on mobile", () => {
    // Anchors re-pointed after f0ed12dd/9640aed4 reshaped the 3-panel layout.
    // Same requirement, same kind of class: controls stack under sm, the text
    // column can shrink, and the left rail narrows instead of pushing the
    // canvas past the viewport. Verified live at 390px: scrollWidth 390,
    // overflow 0, no element wider than the viewport with the properties
    // panel open.
    expect(questionnaire).toContain("flex flex-col sm:flex-row sm:items-center");
    expect(questionnaire).toContain("min-w-0 flex-1");
    expect(questionnaire).toContain("w-64 sm:w-72");
  });

  it("stacks task template project import controls on mobile", () => {
    // f9a774e3 moved the import destination picker out of the workspace into a
    // dialog and updated two sibling wiring specs but missed this one. The new
    // owner is the dialog; assert the controls there still go full width.
    expect(importDialog).toContain("w-full space-y-2");
    expect(importDialog).toContain("min-w-0 flex-1");
    expect(importDialog).toContain('className="w-full"');
  });
});
