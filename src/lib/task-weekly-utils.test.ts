import { describe, it, expect } from "vitest";
import { groupTasksByWeek, calculateWeeklyStats, getWeekDays } from "./task-weekly-utils";

describe("task-weekly-utils", () => {
  const mockTasks = [
    { id: "1", title: "Task 1", status: "done", dueDate: "2026-09-01", priority: "high" },
    { id: "2", title: "Task 2", status: "todo", dueDate: "2026-09-01", priority: "medium" },
    { id: "3", title: "Task 3", status: "done", dueDate: "2026-09-02", priority: "low" },
    { id: "4", title: "Task 4", status: "in_progress", dueDate: "2026-09-03", priority: "urgent" },
    { id: "5", title: "Task 5", status: "todo", dueDate: null, priority: "medium" },
  ];

  it("should get 7 week days starting from Monday or Sunday", () => {
    const days = getWeekDays("2026-08-31");
    expect(days).toHaveLength(7);
    expect(days[0].dateStr).toBe("2026-08-31");
    expect(days[6].dateStr).toBe("2026-09-06");
  });

  it("should calculate weekly statistics correctly", () => {
    const stats = calculateWeeklyStats(mockTasks as any);
    expect(stats.total).toBe(5);
    expect(stats.completed).toBe(2);
    expect(stats.percentage).toBe(40);
  });

  it("should group tasks into days of week", () => {
    const grouped = groupTasksByWeek("2026-08-31", mockTasks as any);
    expect(grouped.days).toHaveLength(7);
    
    // 2026-09-01 (Tuesday) should have 2 tasks
    const tuesday = grouped.days.find(d => d.dateStr === "2026-09-01");
    expect(tuesday?.tasks).toHaveLength(2);
    expect(tuesday?.completedCount).toBe(1);
    expect(tuesday?.percentage).toBe(50);
  });
});
