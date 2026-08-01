import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/task-form.tsx", "utf8");
const sheet = readFileSync("src/components/tasks/task-detail-sheet.tsx", "utf8");

describe("Task edit form regression", () => {
  it("uses one canonical workflow editor instead of stale duplicate mutation controls", () => {
    expect(sheet).toContain('<TaskForm');
    expect(sheet).not.toContain("handleStatusChange");
    expect(sheet).not.toContain("handlePriorityChange");
    expect(sheet).not.toContain("handleDueDateChange");
    expect(sheet).not.toContain("handleAssigneeChange");
    expect(sheet).not.toContain("handleClientVisibleToggle");
  });

  it("sends explicit clear values when editing optional fields", () => {
    expect(form).toContain('description: mode === "edit" ? form.description || null : form.description || undefined');
    expect(form).toContain('assigneeId: mode === "edit" ? form.assigneeId || null : form.assigneeId || undefined');
    expect(form).toContain('dueDate: taskMode === "workflow" ? (mode === "edit" ? form.dueDate || null : form.dueDate || undefined) : undefined');
    expect(form).toContain('if (data.description !== undefined) updateData.description = data.description');
    expect(form).toContain('if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId');
    expect(form).toContain('if (data.dueDate !== undefined) updateData.dueDate = data.dueDate');
  });
});
