import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const manual = read("src/components/time/add-time-log-dialog.tsx");
const route = read("src/components/time/time-route-content.tsx");
const timesheet = read("src/components/time/timesheet.tsx");
const weekly = read("src/components/time/weekly-time-grid.tsx");

describe("manual Time task UI", () => {
  it("requires Project and Task and exposes complete manual billing metadata", () => {
    expect(manual).toContain('t("Task wajib dipilih untuk project ini", "Task is required for this project")');
    expect(manual).toContain('Label htmlFor="manual-time-task"');
    expect(manual).not.toContain("activityId");
    // Tag label uses i18n pattern
    expect(manual).toMatch(/Label.*?t\("Tag"/);
    expect(manual).toContain('t("Bisa ditagih", "Billable")');
    expect(manual).toContain('t("Durasi (menit)", "Duration (minutes)")');
    expect(manual).toContain("billingType");
    expect(manual).toContain("status,");
    expect(manual).toContain("tags:");
  });
});
