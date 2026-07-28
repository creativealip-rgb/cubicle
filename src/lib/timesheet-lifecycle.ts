export type TimeEntryLifecycleStatus = "draft" | "submitted" | "approved" | "rejected" | "invoiced";

export function canEditTimesheetStatus(status: TimeEntryLifecycleStatus): boolean {
  return status === "draft" || status === "rejected";
}

export function nextEntryStatusForDecision(decision: "approved" | "rejected"): "approved" | "rejected" {
  return decision;
}

export function reminderState(input: { activeMinutes: number; weeklyMinutes: number; targetMinutes: number }) {
  return {
    forgottenTimer: input.activeMinutes >= 8 * 60,
    targetShortfallMinutes: Math.max(0, input.targetMinutes - input.weeklyMinutes),
  };
}
