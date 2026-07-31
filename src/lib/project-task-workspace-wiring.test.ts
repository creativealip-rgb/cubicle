import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("shared billing-aware project task workspace", () => {
  it("exports shared workspace with optional project scope", () => {
    const source = read("src/components/tasks/project-task-workspace.tsx");
    expect(source).toContain("export function ProjectTaskWorkspace");
    expect(source).toContain("projectId?: string");
    expect(source).toContain("WorkflowTaskWorkspace");
    expect(source).toContain("ReusableTaskWorkspace");
  });

  it("keeps workflow list and board views", () => {
    const source = read("src/components/tasks/workflow-task-workspace.tsx");
    expect(source).toContain("TasksListTable");
    expect(source).toContain("TasksBoardView");
    expect(source).toContain("List");
    expect(source).toContain("Board");
  });

  it("renders reusable flat rows without workflow fields", () => {
    const source = read("src/components/tasks/reusable-task-workspace.tsx");
    expect(source).toContain("Jam bulan ini");
    expect(source).toContain("Terakhir dipakai");
    expect(source).toContain("Move Up");
    expect(source).toContain("Move Down");
    expect(source).not.toContain("priority");
    expect(source).not.toContain("dueDate");
  });

  it("wires create edit archive restore and max ten global rows", () => {
    const source = read("src/components/tasks/project-task-workspace.tsx");
    expect(source).toContain("TaskForm");
    expect(source).toContain("archiveTask");
    expect(source).toContain("restoreTask");
    expect(source).toContain("PAGE_SIZE = 10");
  });
});
