export const TIME_TRACKING_MODES = ["off", "internal", "billable"] as const;

export type TimeTrackingMode = (typeof TIME_TRACKING_MODES)[number];
export type ProjectBillingType = "project" | "hours" | "package";

export function defaultTimeTrackingMode(input: {
  billingType: ProjectBillingType;
  packageHours?: number | null;
}): TimeTrackingMode {
  if (input.billingType === "hours") return "billable";
  if (input.billingType === "package" && (input.packageHours ?? 0) > 0) return "billable";
  return "internal";
}

export function assertProjectAllowsTimeEntry(project: {
  id: string;
  timeTrackingMode: TimeTrackingMode;
}): void {
  if (project.timeTrackingMode === "off") {
    throw new Error("Pelacakan waktu dinonaktifkan untuk Project ini");
  }
}

export function canMutateHistoricalTimeEntry(project: {
  timeTrackingMode: TimeTrackingMode;
}): boolean {
  return project.timeTrackingMode !== "off";
}

export function timeEntryBillableForMode(mode: TimeTrackingMode): boolean {
  return mode === "billable";
}
