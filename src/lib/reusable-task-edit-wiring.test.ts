import { describe, expect, it } from "vitest";
import fs from "node:fs";
const workspace = fs.readFileSync("src/components/tasks/reusable-task-workspace.tsx", "utf8");
const detail = fs.readFileSync("src/components/tasks/task-detail-sheet.tsx", "utf8");
const form = fs.readFileSync("src/components/forms/task-form.tsx", "utf8");
const actions = fs.readFileSync("src/lib/actions/tasks.ts", "utf8");
describe("reusable task editing", () => {
  it("opens edit dialog with shared form and locked reusable mode", () => {
    expect(workspace).toContain("TaskDetailSheet");
    expect(workspace).toContain('mode: "reusable" as const');
    expect(detail).toContain("TaskForm");
  });
  it("supports description and optional assignee without workflow fields", () => {
    expect(workspace).toContain("description");
    expect(workspace).toContain("assigneeId");
    expect(form).toContain('taskMode === "workflow"');
  });
  it("keeps lifecycle explicit and server mode immutable", () => {
    expect(form).toContain('t("Arsipkan", "Archive")');
    expect(form).toContain('t("Pulihkan", "Restore")');
    expect(actions).toContain("assertTaskModeMutationAllowed");
  });
});
