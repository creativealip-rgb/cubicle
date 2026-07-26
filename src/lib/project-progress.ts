export type ProjectProgressInput = {
  billingType: string;
  totalTasks: number;
  doneTasks: number;
  trackedMinutes: number;
  packageHours: number | null;
};

function taskPct(totalTasks: number, doneTasks: number) {
  if (totalTasks <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((doneTasks / totalTasks) * 100)));
}

function formatHours(minutes: number) {
  const hours = Math.max(0, minutes) / 60;
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(hours);
}

export function getProjectProgress(input: ProjectProgressInput) {
  if (input.billingType === "hours") {
    return {
      pct: taskPct(input.totalTasks, input.doneTasks),
      label: `${formatHours(input.trackedMinutes)} jam`,
    };
  }

  if (input.billingType === "package") {
    const trackedHours = Math.max(0, input.trackedMinutes) / 60;
    const packageHours = input.packageHours && input.packageHours > 0 ? input.packageHours : null;
    return {
      pct: packageHours ? Math.min(100, Math.max(0, Math.round((trackedHours / packageHours) * 100))) : taskPct(input.totalTasks, input.doneTasks),
      label: packageHours
        ? `${formatHours(input.trackedMinutes)} / ${new Intl.NumberFormat("id-ID").format(packageHours)} jam`
        : `${formatHours(input.trackedMinutes)} jam`,
    };
  }

  const pct = taskPct(input.totalTasks, input.doneTasks);
  return { pct, label: `${pct}%` };
}

export function progressColor(pct: number) {
  const clamped = Math.min(100, Math.max(0, pct));
  const lightness = 78 - clamped * 0.28;
  const saturation = 42 + clamped * 0.3;
  return `hsl(160 ${saturation}% ${lightness}%)`;
}
