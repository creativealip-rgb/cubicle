import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("task behavior views", () => {
  it("filters the task page by canonical mode and renders canonical tabs", () => {
    const page = read("src/app/(app)/app/tasks/page.tsx");

    expect(page).toContain("mode?: string");
    expect(page).toContain("tasks.mode");
    expect(page).toContain('params.mode === "workflow"');
    expect(page).toContain('params.mode === "reusable"');
    expect(page).toContain("TaskPageTabs");
  });

  it("shows canonical task mode badges in list and board views", () => {
    const list = read("src/components/tasks/tasks-list-table.tsx");
    const board = read("src/components/tasks/tasks-board-view.tsx");

    for (const source of [list, board]) {
      expect(source).toContain('mode?: "workflow" | "reusable"');
      expect(source).toContain("Workflow");
      expect(source).toContain("Reusable");
    }
  });

  it("uses canonical task mode in actions while legacy form copy remains until page replacement", () => {
    const actions = read("src/lib/actions/tasks.ts");
    const form = read("src/components/forms/task-form.tsx");

    expect(actions).toContain('mode: z.enum(["workflow", "reusable"]).optional()');
    expect(actions).toContain("resolveProjectTaskMode");
    expect(actions).toContain("mode: projectMode");
    expect(form).toContain("taskMode");
  });
});
