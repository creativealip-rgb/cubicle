import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const manual = read("src/components/time/add-time-log-dialog.tsx");
const route = read("src/components/time/time-route-content.tsx");
const timesheet = read("src/components/time/timesheet.tsx");
const weekly = read("src/components/time/weekly-time-grid.tsx");

describe("manual Time task UI", () => {
  it("requires Project and Task in manual entry", () => {
    expect(manual).toContain("Project, Task, deskripsi, dan durasi wajib diisi");
    expect(manual).toContain('Label htmlFor="manual-time-task"');
    expect(manual).not.toContain("activityId");
  });

  it("loads only active reusable Tasks for new Time selectors", () => {
    expect(route).toContain('eq(tasks.mode, "reusable")');
    expect(route).toContain('eq(tasks.lifecycle, "active")');
    expect(route).toContain("writableTaskList");
  });

  it("removes active Activity filters and editor controls while preserving historical labels", () => {
    expect(timesheet).not.toContain("activityFilter");
    expect(timesheet).not.toContain("editActivityId");
    expect(timesheet).not.toContain('t("Aktivitas", "Activity")');
    expect(timesheet).toContain("activityName");
  });

  it("requires Project and Task for weekly rows", () => {
    expect(weekly).toContain("if (!projectId) return");
    expect(weekly).toContain("if (!taskId) return");
    expect(weekly).toContain("disabled={!projectId || !taskId}");
  });
});
