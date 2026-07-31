import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const page = readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");
const tabs = readFileSync("src/components/tasks/task-page-tabs.tsx", "utf8");
const templates = readFileSync("src/components/tasks/task-template-workspace.tsx", "utf8");

describe("global task page redesign", () => {
  it("uses canonical task and template tabs", () => {
    expect(tabs).toContain("Tugas Proyek");
    expect(tabs).toContain("Template Tugas");
    expect(page).toContain("TaskPageTabs");
    expect(page).not.toContain("TaskBehaviorTabs");
  });

  it("uses canonical task mode and keeps focus/filter contracts", () => {
    expect(page).toContain("tasks.mode");
    expect(page).toContain("params.focus");
    expect(page).toContain("ActiveFilterSummary");
    expect(page).toContain("PAGE_SIZE");
  });

  it("provides complete template workspace actions", () => {
    for (const action of ["createTaskTemplate", "updateTaskTemplate", "archiveTaskTemplate", "restoreTaskTemplate", "duplicateTaskTemplate", "createTaskTemplateItem", "removeTaskTemplateItem", "reorderTaskTemplateItems"]) {
      expect(templates).toContain(action);
    }
    expect(templates).toContain("TaskTemplateImportDialog");
  });
});
