export type HabitFrequency = "daily" | "specific_weekdays";

function dates(from: string, to: string) {
  const result: string[] = [];
  for (
    let d = new Date(`${from}T12:00:00Z`), end = new Date(`${to}T12:00:00Z`);
    d <= end;
    d.setUTCDate(d.getUTCDate() + 1)
  )
    result.push(d.toISOString().slice(0, 10));
  return result;
}

export function dateOffset(localDate: string, offset: number) {
  const date = new Date(`${localDate}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export function isHabitScheduled(
  frequency: HabitFrequency,
  weekdays: number[],
  localDate: string,
) {
  return (
    frequency === "daily" ||
    weekdays.includes(new Date(`${localDate}T12:00:00Z`).getUTCDay())
  );
}

export function habitStats(
  frequency: HabitFrequency,
  weekdays: number[],
  from: string,
  to: string,
  checkins: string[],
) {
  const scheduled = dates(from, to).filter((date) =>
    isHabitScheduled(frequency, weekdays, date),
  );
  const done = new Set(checkins);
  let streak = 0,
    bestStreak = 0;
  for (const date of scheduled) {
    if (done.has(date)) {
      streak += 1;
      bestStreak = Math.max(bestStreak, streak);
    } else streak = 0;
  }
  const completed = scheduled.filter((date) => done.has(date)).length;
  return {
    scheduled: scheduled.length,
    completed,
    completionRate: scheduled.length
      ? Math.round((completed / scheduled.length) * 100)
      : 0,
    currentStreak: streak,
    bestStreak,
  };
}
