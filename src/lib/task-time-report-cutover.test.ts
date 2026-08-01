import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildTimeReport } from "@/lib/time-reporting";

const reportPage = readFileSync("src/app/(app)/app/reports/page.tsx", "utf8");

describe("Task-first Time reports", () => {
  it("groups current Time by Task and keeps taskless history counted", () => {
    const report = buildTimeReport([
      { projectId: "p", projectName: "P", taskId: "t", taskTitle: "Build", userId: "u", userName: "U", durationMinutes: 60, billable: true, hourlyRate: 100 },
      { projectId: "p", projectName: "P", taskId: null, taskTitle: null, userId: "u", userName: "U", durationMinutes: 30, billable: false, hourlyRate: null },
    ]);
    expect(report.byTask).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "t", name: "Build", minutes: 60 }),
      expect.objectContaining({ id: "none", name: "Tanpa tugas", minutes: 30 }),
    ]));
    expect(report.summary.totalMinutes).toBe(90);
  });

  it("does not expose Activity as a current report dimension", () => {
    expect(reportPage).not.toContain("activityTimeRows");
    expect(reportPage).not.toContain('t("Per Aktivitas", "By activity")');
    expect(reportPage).not.toContain('t("Waktu per Activity", "Time by Activity")');
    expect(reportPage).toContain('t("Per Tugas", "By task")');
  });
});
