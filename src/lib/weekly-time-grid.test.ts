import { describe, expect, it } from "vitest";
import {
  buildWeeklyGrid,
  formatDurationInput,
  getWeekDates,
  parseDurationInput,
  type WeeklyGridEntry,
} from "@/lib/weekly-time-grid";

describe("weekly time grid", () => {
  it.each([
    ["2", 120],
    ["2:30", 150],
    ["2h 30m", 150],
    ["90m", 90],
    ["", 0],
  ])("parses %s as %i minutes", (value, expected) => {
    expect(parseDurationInput(value)).toBe(expected);
  });

  it.each(["-1", "2:99", "abc", "25", "24h 1m"])("rejects invalid duration %s", (value) => {
    expect(() => parseDurationInput(value)).toThrow();
  });

  it("formats minutes for compact grid input", () => {
    expect(formatDurationInput(0)).toBe("");
    expect(formatDurationInput(90)).toBe("1:30");
    expect(formatDurationInput(120)).toBe("2");
  });

  it("returns a Monday through Sunday week in UTC", () => {
    const dates = getWeekDates("2026-07-29");
    expect(dates.map((date) => date.toISOString().slice(0, 10))).toEqual([
      "2026-07-27", "2026-07-28", "2026-07-29", "2026-07-30", "2026-07-31", "2026-08-01", "2026-08-02",
    ]);
  });

  it("groups by project and task and separates editable grid minutes from immutable minutes", () => {
    const entries: WeeklyGridEntry[] = [
      {
        id: "timer",
        projectId: "project-1",
        projectName: "Website",
        taskId: "task-1",
        taskTitle: "Build",
        startTime: "2026-07-27T01:00:00.000Z",
        durationMinutes: 60,
        manualMinutes: null,
        tags: null,
        status: "draft",
      },
      {
        id: "grid",
        projectId: "project-1",
        projectName: "Website",
        taskId: "task-1",
        taskTitle: "Build",
        startTime: "2026-07-27T00:00:00.000Z",
        durationMinutes: 120,
        manualMinutes: 120,
        tags: "mh1-weekly-grid",
        status: "draft",
      },
      {
        id: "approved",
        projectId: "project-1",
        projectName: "Website",
        taskId: null,
        taskTitle: null,
        startTime: "2026-07-28T00:00:00.000Z",
        durationMinutes: 30,
        manualMinutes: 30,
        tags: null,
        status: "approved",
      },
    ];

    const grid = buildWeeklyGrid(entries, "2026-07-29");
    expect(grid.rows).toHaveLength(2);
    const taskRow = grid.rows.find((row) => row.taskId === "task-1");
    expect(taskRow?.cells[0]).toMatchObject({ totalMinutes: 180, editableMinutes: 120, immutableMinutes: 60 });
    expect(taskRow?.totalMinutes).toBe(180);
    expect(grid.dayTotals.slice(0, 2)).toEqual([180, 30]);
    expect(grid.weekTotalMinutes).toBe(210);
  });
});
