import { describe, expect, it } from "vitest";
import {
  buildTodayTimeline,
  buildWeekDays,
  getEffectiveMinutes,
  getWeekRange,
  type TeamTimeEntry,
} from "./team-timesheet";

const base: TeamTimeEntry = {
  id: "entry-1",
  description: "Build weekly view",
  clientName: "Acme",
  projectName: "Portal",
  activityName: "Development",
  taskTitle: null,
  userName: "Alip",
  startTime: "2026-07-28T02:00:00.000Z",
  endTime: "2026-07-28T03:30:00.000Z",
  pausedAt: null,
  durationMinutes: 90,
  manualMinutes: null,
  status: "draft",
};

describe("team timesheet model", () => {
  it("uses Monday through Sunday as week range", () => {
    const range = getWeekRange(new Date("2026-07-28T12:00:00.000Z"), 0);
    expect(range.start.toISOString()).toBe("2026-07-27T00:00:00.000Z");
    expect(range.end.toISOString()).toBe("2026-08-03T00:00:00.000Z");
  });

  it("includes Sunday in same week", () => {
    const days = buildWeekDays(
      [{ ...base, id: "sun", startTime: "2026-08-02T10:00:00.000Z", durationMinutes: 30 }],
      new Date("2026-07-28T12:00:00.000Z"),
      0,
    );
    expect(days).toHaveLength(7);
    expect(days[6].entries.map((entry) => entry.id)).toEqual(["sun"]);
    expect(days[6].totalMinutes).toBe(30);
  });

  it("calculates running and paused timer duration", () => {
    const now = new Date("2026-07-28T04:00:00.000Z");
    expect(getEffectiveMinutes({ ...base, endTime: null, durationMinutes: null }, now)).toBe(120);
    expect(
      getEffectiveMinutes(
        { ...base, endTime: null, pausedAt: "2026-07-28T03:15:00.000Z", durationMinutes: null },
        now,
      ),
    ).toBe(75);
  });

  it("excludes invalid timestamps from today timeline", () => {
    const timeline = buildTodayTimeline(
      [base, { ...base, id: "bad", startTime: "invalid" }],
      new Date("2026-07-28T12:00:00.000Z"),
    );
    expect(timeline.map((entry) => entry.id)).toEqual(["entry-1"]);
  });
});
