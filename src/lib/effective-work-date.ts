export type EffectiveTimeEntry = {
  workDate?: string | null;
  startTime?: Date | string | null;
  createdAt?: Date | string | null;
};

export function localDateIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function effectiveWorkDate(entry: EffectiveTimeEntry): string {
  if (entry.workDate) return String(entry.workDate).slice(0, 10);
  const candidate = entry.startTime ?? entry.createdAt;
  if (!candidate) return localDateIso(new Date());
  return localDateIso(new Date(candidate));
}

export function weekStartDate(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  result.setDate(result.getDate() - (day === 0 ? 6 : day - 1));
  result.setHours(0, 0, 0, 0);
  return result;
}

export function shiftDateIso(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateIso(date);
}

export function formatMinutes(total: number): string {
  const safe = Math.max(0, total);
  const hours = Math.floor(safe / 60);
  const minutes = safe % 60;
  if (!hours) return `${minutes}m`;
  return minutes ? `${hours}j ${minutes}m` : `${hours}j`;
}
