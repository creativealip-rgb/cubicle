export function cleanPortalRequestDescription(
  description: string | null | undefined,
) {
  if (!description) return null;
  const lines = description.split("\n");
  const visible = lines.flatMap((line) => {
    if (/^\[CLIENT_ORIGIN\s+\w+\]$/.test(line.trim())) return [];
    const preferred = line.match(/^Preferred date:\s*(\d{4}-\d{2}-\d{2})$/);
    if (preferred) {
      const date = new Date(`${preferred[1]}T00:00:00Z`);
      return [
        `Tanggal pilihan: ${date.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`,
      ];
    }
    const period = line.match(/^Period:\s*(.+)$/);
    if (period) return [`Periode: ${period[1]}`];
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
