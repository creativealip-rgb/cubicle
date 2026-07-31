export type TimerCombination = {
  clientId: string | null;
  projectId: string;
  activityId: string | null;
  taskId: string | null;
  description: string | null;
  tags: string | null;
};

export function timerCombinationKey(value: TimerCombination): string {
  return [value.clientId, value.projectId, value.activityId, value.taskId, value.description?.trim() || null, value.tags?.trim() || null]
    .map((part) => part ?? "")
    .join(":");
}

export function uniqueRecentTimerCombinations<T extends TimerCombination>(rows: T[], limit = 5): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = timerCombinationKey(row);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, limit);
}

export function toggleFavoriteKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((item) => item !== key) : [key, ...keys];
}
