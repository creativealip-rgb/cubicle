import { calculateGoalProgress } from "./goals";
import { dateOffset, isHabitScheduled } from "./habits";

export interface GoalItemLike {
  id: string;
  status: string;
  manualProgress: number;
  steps: { isCompleted: boolean }[];
  deadline?: string | null;
  priority?: string | null;
  title?: string;
  lifeArea?: string;
}

export interface HabitItemLike {
  id: string;
  name?: string;
  frequency: string;
  weekdays: number[];
  status: string;
  checkins: { localDate: string }[];
}

export interface GoalMetrics {
  total: number;
  active: number;
  achieved: number;
  avgActiveProgress: number;
}

export function calculateGoalMetrics(goals: GoalItemLike[]): GoalMetrics {
  const total = goals.length;
  let active = 0;
  let achieved = 0;
  let totalActiveProgress = 0;

  for (const g of goals) {
    const progress = calculateGoalProgress(
      g.steps.map((s) => s.isCompleted),
      g.manualProgress,
    );
    if (g.status === "achieved") {
      achieved++;
    } else if (g.status === "in_progress" || g.status === "not_started") {
      active++;
      totalActiveProgress += progress;
    }
  }

  const avgActiveProgress = active > 0 ? Math.round(totalActiveProgress / active) : 0;

  return {
    total,
    active,
    achieved,
    avgActiveProgress,
  };
}

export interface HeatmapCell {
  date: string;
  dayOfWeek: number; // 0 = Sun, 6 = Sat
  completedCount: number;
  totalScheduled: number;
  intensity: number; // 0 to 4
}

export function calculateHabitHeatmap(
  habits: HabitItemLike[],
  today: string,
  daysCount: number = 35,
): HeatmapCell[] {
  const activeHabits = habits.filter((h) => h.status === "active");
  const cells: HeatmapCell[] = [];

  for (let i = daysCount - 1; i >= 0; i--) {
    const dateStr = dateOffset(today, -i);
    const d = new Date(dateStr + "T00:00:00Z");
    const dayOfWeek = d.getUTCDay();

    let scheduled = 0;
    let completed = 0;

    for (const h of activeHabits) {
      if (isHabitScheduled(h.frequency as "daily" | "specific_weekdays", h.weekdays, dateStr)) {
        scheduled++;
        if (h.checkins.some((c) => c.localDate === dateStr)) {
          completed++;
        }
      }
    }

    let intensity = 0;
    if (scheduled > 0) {
      const ratio = completed / scheduled;
      if (completed > 0) {
        if (ratio >= 1) intensity = 4;
        else if (ratio >= 0.66) intensity = 3;
        else if (ratio >= 0.33) intensity = 2;
        else intensity = 1;
      }
    }

    cells.push({
      date: dateStr,
      dayOfWeek,
      completedCount: completed,
      totalScheduled: scheduled,
      intensity,
    });
  }

  return cells;
}

export interface DeadlineStatus {
  label: string;
  daysRemaining: number | null;
  isOverdue: boolean;
  isUrgent: boolean;
}

export function getDeadlineStatus(
  deadline: string | null | undefined,
  today: string,
): DeadlineStatus {
  if (!deadline) {
    return {
      label: "No deadline",
      daysRemaining: null,
      isOverdue: false,
      isUrgent: false,
    };
  }

  const d1 = new Date(deadline + "T00:00:00Z").getTime();
  const d2 = new Date(today + "T00:00:00Z").getTime();
  const diffDays = Math.round((d1 - d2) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)} days overdue`,
      daysRemaining: diffDays,
      isOverdue: true,
      isUrgent: false,
    };
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      daysRemaining: 0,
      isOverdue: false,
      isUrgent: true,
    };
  }

  return {
    label: `${diffDays} days left`,
    daysRemaining: diffDays,
    isOverdue: false,
    isUrgent: diffDays <= 7,
  };
}

export interface WeeklyConsistency {
  weekLabel: string;
  startDate: string;
  endDate: string;
  completed: number;
  totalScheduled: number;
  rate: number;
}

export function calculateWeeklyConsistency(
  habits: HabitItemLike[],
  today: string,
  weeks: number = 5,
): WeeklyConsistency[] {
  const activeHabits = habits.filter((h) => h.status === "active");
  const result: WeeklyConsistency[] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const endOffset = w * 7;
    const startOffset = endOffset + 6;
    const startDate = dateOffset(today, -startOffset);
    const endDate = dateOffset(today, -endOffset);

    let completed = 0;
    let scheduled = 0;

    for (let d = 0; d < 7; d++) {
      const dateStr = dateOffset(startDate, d);
      for (const h of activeHabits) {
        if (isHabitScheduled(h.frequency as "daily" | "specific_weekdays", h.weekdays, dateStr)) {
          scheduled++;
          if (h.checkins.some((c) => c.localDate === dateStr)) {
            completed++;
          }
        }
      }
    }

    const rate = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
    result.push({
      weekLabel: `W-${weeks - w}`,
      startDate,
      endDate,
      completed,
      totalScheduled: scheduled,
      rate,
    });
  }

  return result;
}
