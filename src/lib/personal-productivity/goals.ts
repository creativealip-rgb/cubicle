export type GoalStatus =
  "not_started" | "in_progress" | "achieved" | "deferred" | "cancelled";

export function calculateGoalProgress(
  steps: boolean[],
  manualProgress: number,
) {
  if (!steps.length)
    return Math.max(0, Math.min(100, Math.round(manualProgress)));
  return Math.round((steps.filter(Boolean).length / steps.length) * 100);
}

export function normalizeGoalStatus(
  status: GoalStatus,
  _progress: number,
): GoalStatus {
  return status;
}
