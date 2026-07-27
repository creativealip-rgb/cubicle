export type ReportPreset =
  "month" | "previous-month" | "quarter" | "year" | "custom";

export type ReportPeriod = {
  preset: ReportPreset;
  start: string;
  end: string;
  comparisonStart: string;
  comparisonEnd: string;
};

export type ReportTimeGroup = {
  key: string;
  label: string;
  start: string;
  end: string;
};

const DAY_MS = 86_400_000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(date: Date) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

function parseIsoDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || toIsoDate(date) !== value
    ? null
    : date;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function endOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0));
}

function withComparison(
  preset: ReportPreset,
  start: Date,
  end: Date,
): ReportPeriod {
  let comparisonStart: Date;
  let comparisonEnd: Date;

  if (preset === "month" || preset === "previous-month") {
    comparisonStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1),
    );
    comparisonEnd = endOfMonth(
      comparisonStart.getUTCFullYear(),
      comparisonStart.getUTCMonth(),
    );
  } else if (preset === "quarter") {
    comparisonStart = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 3, 1),
    );
    comparisonEnd = endOfMonth(
      comparisonStart.getUTCFullYear(),
      comparisonStart.getUTCMonth() + 2,
    );
  } else if (preset === "year") {
    comparisonStart = new Date(Date.UTC(start.getUTCFullYear() - 1, 0, 1));
    comparisonEnd = new Date(Date.UTC(start.getUTCFullYear() - 1, 11, 31));
  } else {
    const durationDays =
      Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
    comparisonEnd = addDays(start, -1);
    comparisonStart = addDays(comparisonEnd, -(durationDays - 1));
  }

  return {
    preset,
    start: toIsoDate(start),
    end: toIsoDate(end),
    comparisonStart: toIsoDate(comparisonStart),
    comparisonEnd: toIsoDate(comparisonEnd),
  };
}

export function buildReportPeriod(
  params: { period?: string; from?: string; to?: string },
  now = new Date(),
): ReportPeriod {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  if (params.period === "previous-month") {
    const start = new Date(Date.UTC(year, month - 1, 1));
    return withComparison(
      "previous-month",
      start,
      endOfMonth(start.getUTCFullYear(), start.getUTCMonth()),
    );
  }
  if (params.period === "quarter") {
    const quarterMonth = Math.floor(month / 3) * 3;
    return withComparison(
      "quarter",
      new Date(Date.UTC(year, quarterMonth, 1)),
      endOfMonth(year, quarterMonth + 2),
    );
  }
  if (params.period === "year") {
    return withComparison(
      "year",
      new Date(Date.UTC(year, 0, 1)),
      new Date(Date.UTC(year, 11, 31)),
    );
  }
  if (params.period === "custom") {
    const start = parseIsoDate(params.from);
    const end = parseIsoDate(params.to);
    if (start && end && start <= end)
      return withComparison("custom", start, end);
  }
  return withComparison(
    "month",
    new Date(Date.UTC(year, month, 1)),
    endOfMonth(year, month),
  );
}

function locale(lang: string) {
  return lang === "en" ? "en-US" : "id-ID";
}

export function buildTimeGroups(
  startValue: string,
  endValue: string,
  preset: ReportPreset,
  lang: string,
): ReportTimeGroup[] {
  const start = parseIsoDate(startValue);
  const end = parseIsoDate(endValue);
  if (!start || !end || start > end) return [];
  const rangeDays = Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1;
  const useMonths = preset === "quarter" || preset === "year" || rangeDays > 62;
  const groups: ReportTimeGroup[] = [];

  if (useMonths) {
    let cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    );
    while (cursor <= end) {
      const groupStart = cursor < start ? start : cursor;
      const monthEnd = endOfMonth(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
      );
      const groupEnd = monthEnd > end ? end : monthEnd;
      groups.push({
        key: toIsoDate(cursor).slice(0, 7),
        label: cursor.toLocaleDateString(locale(lang), {
          month: "short",
          timeZone: "UTC",
        }),
        start: toIsoDate(groupStart),
        end: toIsoDate(groupEnd),
      });
      cursor = new Date(
        Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1),
      );
    }
    return groups;
  }

  let cursor = start;
  let index = 1;
  while (cursor <= end) {
    const daysUntilSunday = 7 - (cursor.getUTCDay() || 7);
    const weekEnd = addDays(cursor, daysUntilSunday);
    const groupEnd = weekEnd > end ? end : weekEnd;
    groups.push({
      key: `week-${index}`,
      label: lang === "en" ? `Week ${index}` : `Minggu ${index}`,
      start: toIsoDate(cursor),
      end: toIsoDate(groupEnd),
    });
    cursor = addDays(groupEnd, 1);
    index += 1;
  }
  return groups;
}

export function reportPeriodLabel(period: ReportPeriod, lang: string) {
  const start = parseIsoDate(period.start)!;
  const end = parseIsoDate(period.end)!;
  if (period.preset === "month" || period.preset === "previous-month") {
    return start.toLocaleDateString(locale(lang), {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });
  }
  if (period.preset === "quarter") {
    return `Q${Math.floor(start.getUTCMonth() / 3) + 1} ${start.getUTCFullYear()}`;
  }
  if (period.preset === "year") return String(start.getUTCFullYear());
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  };
  return `${start.toLocaleDateString(locale(lang), options)} – ${end.toLocaleDateString(locale(lang), options)}`;
}
