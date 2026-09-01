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
  const oldest = checkins.reduce((min, date) => date < min ? date : min, today);
  const days = Math.max(1, Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${oldest}T12:00:00Z`).getTime()) / 86_400_000) + graceDays + 1);
  for (let offset = 0; offset < days; offset++) {
    const date = dateOffset(today, -offset);
    if (!isHabitScheduled(frequency, weekdays, date)) continue;
    if (done.has(date)) {
      streak++;
    } else if (missed < graceDays) {
      missed++;
    } else {
      break;
    }
  }
  return { streak, missed, inRecovery: streak > 0 && missed > 0 && missed <= graceDays };
}

export function healthyHabitStats(frequency: HabitFrequency, weekdays: number[], today: string, checkins: string[]) {
  const done = new Set(checkins);
  let best = 0, run = 0, missed = 0, started = false;
  const oldest = checkins.reduce((min, date) => date < min ? date : min, today);
  const days = Math.max(1, Math.round((new Date(`${today}T12:00:00Z`).getTime() - new Date(`${oldest}T12:00:00Z`).getTime()) / 86_400_000) + 1);
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = dateOffset(today, -offset);
    if (!isHabitScheduled(frequency, weekdays, date)) continue;
    if (done.has(date)) {
      started = true;
      run++;
      best = Math.max(best, run);
    } else if (!started) continue;
    else if (missed < 1) missed++;
    else {
      run = 0;
      missed = 0;
      started = false;
    }
  }
  return { currentStreak: calculateHealthyStreak(frequency, weekdays, today, checkins).streak, bestStreak: best, completedDays: done.size };
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
