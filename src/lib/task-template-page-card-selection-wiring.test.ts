import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workspace = readFileSync("src/components/tasks/task-template-workspace.tsx", "utf8");
const dialog = readFileSync("src/components/tasks/task-template-import-dialog.tsx", "utf8");

describe("task template page card selection", () => {
  it("selects the full template card before import and passes it into the dialog", () => {
    expect(workspace).toContain('aria-pressed={selectedTemplateId === template.id}');
    expect(workspace).toContain('setSelectedTemplateId((current) => current === template.id ? null : template.id)');
    expect(workspace).toContain('selectedTemplateId={selectedTemplateId}');
    expect(dialog).toContain('selectedTemplateId ? [selectedTemplateId] : []');
  });

  it("keeps nested edit and item controls independent", () => {
    expect(workspace).toContain('closest("button, input, select, textarea, a")');
    expect(workspace).toContain("event.target !== event.currentTarget");
  });
});
