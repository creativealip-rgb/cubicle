export type ActivitySelectionStage =
  | "start"
  | "completion"
  | "manual"
  | "edit"
  | "approval";

export function assertActivitySelection(input: {
  activityRequired: boolean;
  activityId: string | null | undefined;
  stage: ActivitySelectionStage;
}): void {
  if (
    input.activityRequired &&
    input.stage !== "start" &&
    !input.activityId
  ) {
    throw new Error("Activity wajib dipilih untuk Project ini");
  }
}

export function assertSelectableActivity(input: {
  sameWorkspace: boolean;
  status: "active" | "archived";
  projectEnabled: boolean;
}): void {
  if (!input.sameWorkspace) {
    throw new Error("Activity tidak berada di workspace aktif");
  }
  if (input.status !== "active") {
    throw new Error("Activity sudah diarsipkan");
  }
  if (!input.projectEnabled) {
    throw new Error("Activity tidak diaktifkan untuk Project ini");
  }
}

type RateCandidate = number | string | null | undefined;

function positiveRate(value: RateCandidate): number | null {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

export function resolveActivityHourlyRate(input: {
  explicitRate: RateCandidate;
  projectActivityRate: RateCandidate;
  projectRate: RateCandidate;
  activityDefaultRate: RateCandidate;
  workspaceDefaultRate: RateCandidate;
}): number | null {
  for (const candidate of [
    input.explicitRate,
    input.projectActivityRate,
    input.projectRate,
    input.activityDefaultRate,
    input.workspaceDefaultRate,
  ]) {
    const rate = positiveRate(candidate);
    if (rate !== null) return rate;
  }
  return null;
}
