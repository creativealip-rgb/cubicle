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
    expect(source).not.toContain('t("Prioritas", "Priority")');
    expect(source).not.toContain('t("Jatuh Tempo", "Due Date")');
  });

  it("wires create edit archive restore and max ten global rows", () => {
    const source = read("src/components/tasks/project-task-workspace.tsx");
    expect(source).toContain("TaskForm");
    expect(source).toContain("DialogTrigger");
    expect(source).toContain('t("Buat Tugas", "Create Task")');
    expect(source).not.toContain('<TaskForm mode="create" projectId={projectId} members={members} projects={projects} taskMode={mode} />');
    expect(source).toContain("archiveTask");
    expect(source).toContain("restoreTask");
    expect(source).toContain("PAGE_SIZE = 10");
  });

  it("shows workflow-only fields only for workflow task forms", () => {
    const source = read("src/components/forms/task-form.tsx");
    expect(source).toContain('{taskMode === "workflow" && (');
    expect(source).toContain('t("Status", "Status")');
    expect(source).toContain('t("Prioritas", "Priority")');
    expect(source).toContain('t("Jatuh Tempo", "Due Date")');
    expect(source).toContain('t("Terlihat oleh klien di portal", "Visible to client in portal")');
  });
});
