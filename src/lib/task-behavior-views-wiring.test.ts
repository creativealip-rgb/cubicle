import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("task behavior views", () => {
  it("filters the task page by behavior and keeps an all view", () => {
    const page = read("src/app/(app)/app/tasks/page.tsx");

    expect(page).toContain("behavior?: string");
    expect(page).toContain("tasks.behavior");
    expect(page).toContain('params.behavior === "one_time"');
    expect(page).toContain('params.behavior === "recurring"');
    expect(page).toContain("TaskBehaviorTabs");
  });

  it("shows task behavior badges in list and board views", () => {
    const list = read("src/components/tasks/tasks-list-table.tsx");
    const board = read("src/components/tasks/tasks-board-view.tsx");

    for (const source of [list, board]) {
      expect(source).toContain('behavior: "one_time" | "recurring" | null');
      expect(source).toContain("Sekali selesai");
      expect(source).toContain("Aktivitas berulang");
    }
  });

  it("uses canonical task mode in actions while legacy form copy remains until page replacement", () => {
    const actions = read("src/lib/actions/tasks.ts");
    const form = read("src/components/forms/task-form.tsx");

    expect(actions).toContain('mode: z.enum(["workflow", "reusable"]).optional()');
    expect(actions).toContain("resolveProjectTaskMode");
    expect(actions).toContain("mode: projectMode");
    expect(form).toContain("Jenis tugas");
    expect(form).toContain("Sekali selesai");
    expect(form).toContain("Aktivitas berulang");
  });
});
