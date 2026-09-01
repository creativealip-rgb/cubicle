import { describe, expect, it } from "vitest";
import { habitStats, isHabitScheduled } from "./habits";

describe("habit schedule and statistics", () => {
  it("schedules daily habits every day", () => {
    expect(isHabitScheduled("daily", [], "2026-09-01")).toBe(true);
  });

  it("schedules only selected weekdays", () => {
    expect(isHabitScheduled("specific_weekdays", [1, 3], "2026-09-02")).toBe(
      true,
    );
    expect(isHabitScheduled("specific_weekdays", [1, 3], "2026-09-03")).toBe(
      false,
    );
  });

  it("does not break streak on unscheduled days", () => {
    const stats = habitStats(
      "specific_weekdays",
      [1, 3, 5],
      "2026-08-31",
      "2026-09-06",
      ["2026-08-31", "2026-09-02", "2026-09-04"],
    );
    expect(stats).toEqual({
      scheduled: 3,
      completed: 3,
      completionRate: 100,
      currentStreak: 3,
      bestStreak: 3,
    });
  });
});
