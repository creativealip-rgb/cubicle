export function cleanPortalRequestDescription(
  description: string | null | undefined,
  lang: "id" | "en" = "id",
) {
  if (!description) return null;
  const lines = description.split("\n");
  const visible = lines.flatMap((line) => {
    if (/^\[CLIENT_ORIGIN\s+\w+\]$/.test(line.trim())) return [];
    const preferred = line.match(/^Preferred date:\s*(\d{4}-\d{2}-\d{2})$/);
    if (preferred) {
      const date = new Date(`${preferred[1]}T00:00:00Z`);
      return [
        `${lang === "en" ? "Selected date" : "Tanggal pilihan"}: ${date.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
      ];
    }
    const period = line.match(/^Period:\s*(.+)$/);
    if (period)
      return [`${lang === "en" ? "Period" : "Periode"}: ${period[1]}`];
    return [line];
  });
  return visible.join("\n").trim() || null;
}

export function partitionPortalRequests<T extends { status: string }>(
  rows: T[],
) {
  return {
    open: rows.filter((row) => row.status === "pending"),
    history: rows.filter((row) => row.status !== "pending"),
  };
}

export function groupByProjectId<T extends { projectId: string | null }>(
  rows: T[],
) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    if (!row.projectId) continue;
    const list = grouped.get(row.projectId) ?? [];
    list.push(row);
    grouped.set(row.projectId, list);
  }
  return grouped;
}

type PortalTimeEntry = {
  projectId: string | null;
  manualMinutes: number | null;
  durationMinutes: number | null;
  startTime: Date | null;
  endTime: Date | null;
  billable: boolean;
};

export function summarizeProjectHours(rows: PortalTimeEntry[]) {
  const result = new Map<
    string,
    { totalMinutes: number; billableMinutes: number; entryCount: number }
  >();
  for (const row of rows) {
    if (!row.projectId) continue;
    const current = result.get(row.projectId) ?? {
      totalMinutes: 0,
      billableMinutes: 0,
      entryCount: 0,
    };
    const minutes = row.manualMinutes
      ? row.manualMinutes
      : row.startTime && row.endTime
        ? Math.round((row.endTime.getTime() - row.startTime.getTime()) / 60_000)
        : row.durationMinutes || 0;
    current.totalMinutes += minutes;
    if (row.billable) current.billableMinutes += minutes;
    current.entryCount += 1;
    result.set(row.projectId, current);
  }
  return result;
}

export function portalOpenVisit(workspaceId: string, clientId: string) {
  return {
    workspaceId,
    clientId,
    resourceType: "portal_open",
    resourceId: clientId,
  };
}

export function projectProgressLabel(
  status: string,
  completed: number,
  total: number,
) {
  if (
    total > 0 &&
    completed === total &&
    !["completed", "cancelled", "archived"].includes(status)
  ) {
    return "Semua tugas selesai · menunggu penutupan";
  }
  return `${completed}/${total} tugas selesai`;
}
