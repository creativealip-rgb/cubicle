import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const form = readFileSync("src/components/forms/task-form.tsx", "utf8");
const sheet = readFileSync("src/components/tasks/task-detail-sheet.tsx", "utf8");

describe("Task edit form regression", () => {
  it("uses the canonical inline 2-panel editor with auto-save attribute handlers", () => {
    // The sheet owns its inline workspace editor (a9369f0c) instead of embedding TaskForm.
    expect(sheet).not.toContain('<TaskForm');
    expect(sheet).toContain("handleStatusChange");
    expect(sheet).toContain("handlePriorityChange");
    expect(sheet).toContain("handleAssigneeChange");
  });

  it("sends explicit clear values when editing optional fields", () => {
    expect(form).toContain('description: mode === "edit" ? form.description || null : form.description || undefined');
    expect(form).toContain('assigneeId: mode === "edit" ? form.assigneeId || null : form.assigneeId || undefined');
    expect(form).toContain('dueDate: selectedTaskMode === "workflow" ? (mode === "edit" ? form.dueDate || null : form.dueDate || undefined) : undefined');
    expect(form).toContain('if (data.description !== undefined) updateData.description = data.description');
    expect(form).toContain('if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId');
    expect(form).toContain('if (data.dueDate !== undefined) updateData.dueDate = data.dueDate');
  });
});
