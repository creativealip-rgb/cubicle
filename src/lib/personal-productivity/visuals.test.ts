import { describe, expect, it } from "vitest";
import {
  calculateGoalMetrics,
  calculateHabitHeatmap,
  calculateWeeklyConsistency,
  getDeadlineStatus,
} from "./visuals";

describe("Productivity Visuals Domain", () => {
  it("calculates goal metrics correctly", () => {
    const goals = [
      { id: "1", status: "in_progress", manualProgress: 40, steps: [] },
      { id: "2", status: "achieved", manualProgress: 100, steps: [{ isCompleted: true }, { isCompleted: true }] },
      { id: "3", status: "not_started", manualProgress: 0, steps: [{ isCompleted: false }, { isCompleted: true }] }, // 50%
      { id: "4", status: "cancelled", manualProgress: 10, steps: [] },
    ];
    const metrics = calculateGoalMetrics(goals);
    expect(metrics.total).toBe(4);
    expect(metrics.active).toBe(2); // in_progress & not_started
    expect(metrics.achieved).toBe(1);
    // Active progress: goal 1 = 40%, goal 3 = 50% => avg = 45%
    expect(metrics.avgActiveProgress).toBe(45);
  });

  it("calculates habit heatmap for past days", () => {
    const habits = [
      {
        id: "h1",
        frequency: "daily",
        weekdays: [],
        status: "active",
        checkins: [{ localDate: "2026-09-01" }, { localDate: "2026-08-31" }],
      },
      {
        id: "h2",
        frequency: "daily",
        weekdays: [],
        status: "active",
        checkins: [{ localDate: "2026-09-01" }],
      },
    ];

    const heatmap = calculateHabitHeatmap(habits, "2026-09-01", 7);
    expect(heatmap.length).toBe(7);
    const todayCell = heatmap[heatmap.length - 1];
    expect(todayCell.date).toBe("2026-09-01");
    expect(todayCell.completedCount).toBe(2);
    expect(todayCell.totalScheduled).toBe(2);
    expect(todayCell.intensity).toBe(4); // 100% completed
  });

  it("calculates deadline status", () => {
    expect(getDeadlineStatus(null, "2026-09-01")).toEqual({ label: "No deadline", daysRemaining: null, isOverdue: false, isUrgent: false });
    expect(getDeadlineStatus("2026-09-05", "2026-09-01")).toEqual({ label: "4 days left", daysRemaining: 4, isOverdue: false, isUrgent: true });
    expect(getDeadlineStatus("2026-08-30", "2026-09-01")).toEqual({ label: "2 days overdue", daysRemaining: -2, isOverdue: true, isUrgent: false });
  });

  it("calculates weekly consistency trends", () => {
    const habits = [
      {
        id: "h1",
        frequency: "daily",
        weekdays: [],
        status: "active",
        checkins: [{ localDate: "2026-09-01" }],
      },
    ];
    const trends = calculateWeeklyConsistency(habits, "2026-09-01", 4);
    expect(trends.length).toBe(4);
    expect(trends[3].totalScheduled).toBeGreaterThan(0);
  });
});
