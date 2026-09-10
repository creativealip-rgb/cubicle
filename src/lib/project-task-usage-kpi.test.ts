import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const tasksPage = readFileSync("src/app/(app)/app/tasks/page.tsx", "utf8");
const projectPage = readFileSync("src/app/(app)/app/projects/[projectId]/page.tsx", "utf8");
const overview = readFileSync("src/components/projects/project-overview.tsx", "utf8");

describe("project recurring task usage", () => {
  it("counts manual and timer minutes for this month", () => {
    expect(tasksPage).toContain("sum(coalesce(te.manual_minutes, te.duration_minutes, 0))");
    expect(projectPage).toContain("sum(coalesce(te.manual_minutes, te.duration_minutes, 0))");
    expect(projectPage).toContain("monthMinutes: task.monthMinutes");
    expect(projectPage).toContain("lastUsedAt: task.lastUsedAt");
  });

  it("shows active recurring task count for hourly and retainer projects", () => {
    expect(projectPage).toContain('task.mode === "reusable" && task.lifecycle === "active"');
    expect(overview).toContain('t("Tugas Berulang Aktif", "Active Recurring Tasks")');
    expect(overview).toContain("String(taskUsageProgress.total)");
  });
});
