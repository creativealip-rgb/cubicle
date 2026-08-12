export type Lang = "id" | "en";

/** BCP-47 locale for a UI language. Kept here so pure helpers stay testable. */
export function uiLocale(lang: Lang): string {
  return lang === "en" ? "en-US" : "id-ID";
}

export type ProjectProgressInput = {
  billingType: string;
  totalTasks: number;
  doneTasks: number;
  trackedMinutes: number;
  packageHours: number | null;
  retainerIncludedMinutes?: number | null;
  /** Active UI language; drives number formatting. Defaults to "id". */
  lang?: Lang;
};

function taskPct(totalTasks: number, doneTasks: number) {
  if (totalTasks <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((doneTasks / totalTasks) * 100)));
}

function formatHours(minutes: number, locale: string) {
  const hours = Math.max(0, minutes) / 60;
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(hours);
}

export function getProjectProgress(input: ProjectProgressInput) {
  const locale = uiLocale(input.lang ?? "id");

  if (input.billingType === "retainer") {
    const included = input.retainerIncludedMinutes && input.retainerIncludedMinutes > 0 ? input.retainerIncludedMinutes : null;
    return {
      pct: included ? Math.min(100, Math.max(0, Math.round((input.trackedMinutes / included) * 100))) : taskPct(input.totalTasks, input.doneTasks),
      label: included
        ? `${formatHours(input.trackedMinutes, locale)} / ${formatHours(included, locale)} jam`
        : `${formatHours(input.trackedMinutes, locale)} jam`,
    };
  }

  if (input.billingType === "hours") {
    return {
      pct: taskPct(input.totalTasks, input.doneTasks),
      label: `${formatHours(input.trackedMinutes, locale)} jam`,
    };
  }

  if (input.billingType === "package") {
    const trackedHours = Math.max(0, input.trackedMinutes) / 60;
    const packageHours = input.packageHours && input.packageHours > 0 ? input.packageHours : null;
    return {
      pct: packageHours ? Math.min(100, Math.max(0, Math.round((trackedHours / packageHours) * 100))) : taskPct(input.totalTasks, input.doneTasks),
      label: packageHours
        ? `${formatHours(input.trackedMinutes, locale)} / ${new Intl.NumberFormat(locale).format(packageHours)} jam`
        : `${formatHours(input.trackedMinutes, locale)} jam`,
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

/** Semantic color for a progress bar given completion and whether it is overdue. */
export function progressTone(pct: number, overdue: boolean): string {
  const clamped = Math.min(100, Math.max(0, pct));
  if (overdue && clamped < 100) return "bg-amber-500";
  if (clamped >= 100) return "bg-emerald-600";
  return progressColor(clamped);
}
