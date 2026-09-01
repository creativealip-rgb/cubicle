import { dateOffset, isHabitScheduled, type HabitFrequency } from "./habits";

export function calculateHealthyStreak(
  frequency: HabitFrequency,
  weekdays: number[],
  today: string,
  checkins: string[],
  graceDays = 1,
) {
  const done = new Set(checkins);
  let streak = 0;
  let missed = 0;
  let started = false;
  for (let offset = 0; offset < 90; offset++) {
    const date = dateOffset(today, -offset);
    if (!isHabitScheduled(frequency, weekdays, date)) continue;
    if (done.has(date)) {
      started = true;
      streak++;
    } else if (!started && missed < graceDays) {
      missed++;
    } else {
      break;
    }
  }
  return { streak, missed, inRecovery: missed > 0 && missed <= graceDays };
}

export function weeklyReview(
  completed: number,
  scheduled: number,
  activeGoals: number,
  progressingGoals: number,
) {
  const rate = scheduled ? Math.round((completed / scheduled) * 100) : 0;
  return {
    rate,
    headline: scheduled === 0 ? "Start with one habit" : rate >= 80 ? "Strong week" : rate >= 40 ? "Keep going" : "One small step counts",
    goalSummary: activeGoals ? `${progressingGoals}/${activeGoals} goals moving` : "No active goals yet",
  };
}

export function quickCaptureLinks() {
  return [
    { href: "/app/productivity?tab=habits", label: "Check a habit" },
    { href: "/app/productivity?tab=goals", label: "Update a goal" },
  ];
}
