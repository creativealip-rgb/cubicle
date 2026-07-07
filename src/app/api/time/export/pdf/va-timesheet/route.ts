import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { clients, projects, tasks, timeEntries, users } from "@/db/schema";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";
import { and, desc, eq, gte, lte } from "drizzle-orm";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatHours(minutes: number | null): string {
  const m = minutes ?? 0;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return `${h}:${String(mins).padStart(2, "0")}:00`;
}

function formatTime(d: Date | string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatDateShort(d: Date | string, locale: string): string {
  return new Date(d).toLocaleDateString(locale, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

type Entry = {
  date: Date | null;
  client: string | null;
  project: string | null;
  task: string | null;
  tags: string | null;
  description: string | null;
  startTime: Date | null;
  endTime: Date | null;
  durationMinutes: number | null;
  billable: boolean | null;
  hourlyRate: string | null;
  user: string | null;
};

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = requireUser(session.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const cookieStore = await cookies();
  const lang = (cookieStore.get("cubiqlo_lang")?.value === "en" ? "en" : "id") as "id" | "en";
  const locale = lang === "en" ? "en-US" : "id-ID";

  // Read date range from query params
  const url = new URL(request.url);
  const dateFrom = url.searchParams.get("from");
  const dateTo = url.searchParams.get("to");
  const clientId = url.searchParams.get("clientId");

  const conditions = [eq(timeEntries.workspaceId, workspaceId)];
  if (dateFrom) conditions.push(gte(timeEntries.startTime, new Date(dateFrom)));
  if (dateTo) conditions.push(lte(timeEntries.startTime, new Date(dateTo + "T23:59:59")));
  if (clientId) conditions.push(eq(timeEntries.clientId, clientId));

  const entries = await db
    .select({
      date: timeEntries.startTime,
      client: clients.name,
      project: projects.name,
      task: tasks.title,
      tags: timeEntries.tags,
      description: timeEntries.description,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      user: users.name,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(...conditions))
    .orderBy(desc(timeEntries.startTime))
    .limit(500);

  // Totals
  const totalMinutes = entries.reduce((s, e) => s + Number(e.durationMinutes ?? 0), 0);
  const billableMinutes = entries.filter((e) => e.billable).reduce((s, e) => s + Number(e.durationMinutes ?? 0), 0);
  const totalBillableAmount = entries.reduce((s, e) => {
    if (!e.billable) return s;
    return s + (Number(e.durationMinutes ?? 0) / 60) * Number(e.hourlyRate ?? 0);
  }, 0);

  // Time frame string
  const timeFrame = dateFrom && dateTo
    ? `${formatDateShort(dateFrom, locale)} - ${formatDateShort(dateTo, locale)}`
    : lang === "en" ? "All time" : "Semua waktu";

  // Group entries by client → date
  const clientGroups = new Map<string, Map<string, Entry[]>>();
  for (const entry of entries) {
    const clientName = entry.client || (lang === "en" ? "No client" : "Tanpa klien");
    const dateKey = entry.date ? new Date(entry.date).toISOString().split("T")[0]! : "unknown";
    if (!clientGroups.has(clientName)) clientGroups.set(clientName, new Map());
    const dateMap = clientGroups.get(clientName)!;
    if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
    dateMap.get(dateKey)!.push(entry);
  }

  // Build detailed rows grouped by client
  let detailedRows = "";
  let grandTotalMinutes = 0;
  let grandTotalAmount = 0;

  for (const [clientName, dateMap] of clientGroups) {
    detailedRows += `<tr><td colspan="7" style="background:#e0e7ff;font-weight:600;padding:8px;">Client: ${escapeHtml(clientName)}</td></tr>`;

    for (const [, dayEntries] of dateMap) {
      const firstEntry = dayEntries[0]!;
      const dayDate = firstEntry.date ? formatDateShort(firstEntry.date, locale) : "—";
      const dayUser = firstEntry.user || "—";

      detailedRows += `<tr style="background:#f9fafb;"><td colspan="7" style="padding:6px 8px;"><strong>${escapeHtml(dayDate)}</strong> &nbsp; ${escapeHtml(dayUser)}</td></tr>`;

      for (const entry of dayEntries) {
        const minutes = Number(entry.durationMinutes ?? 0);
        const rate = Number(entry.hourlyRate ?? 0);
        const amount = entry.billable ? (minutes / 60) * rate : 0;
        grandTotalMinutes += minutes;
        grandTotalAmount += amount;

        detailedRows += `<tr>
          <td></td>
          <td>${escapeHtml(entry.project)}</td>
          <td>${escapeHtml(entry.task)}</td>
          <td>${escapeHtml(entry.tags)}</td>
          <td>USD ${amount.toFixed(2)}</td>
          <td>${formatTime(entry.startTime)} - ${formatTime(entry.endTime)}</td>
          <td>${formatHours(minutes)}</td>
        </tr>`;
      }
    }
  }

  // Dashboard report — group by project → task
  const projectTaskMap = new Map<string, Map<string, { total: number; billable: number }>>();
  for (const entry of entries) {
    const projName = entry.project || (lang === "en" ? "No project" : "Tanpa proyek");
    const taskName = entry.task || (lang === "en" ? "No task" : "Tanpa tugas");
    const minutes = Number(entry.durationMinutes ?? 0);
    if (!projectTaskMap.has(projName)) projectTaskMap.set(projName, new Map());
    const taskMap = projectTaskMap.get(projName)!;
    if (!taskMap.has(taskName)) taskMap.set(taskName, { total: 0, billable: 0 });
    const bucket = taskMap.get(taskName)!;
    bucket.total += minutes;
    if (entry.billable) bucket.billable += minutes;
  }

  let dashboardRows = "";
  for (const [projName, taskMap] of projectTaskMap) {
    const projTotal = Array.from(taskMap.values()).reduce((s, v) => s + v.total, 0);
    const projBillable = Array.from(taskMap.values()).reduce((s, v) => s + v.billable, 0);
    dashboardRows += `<tr style="background:#f3f4f6;"><td><strong>Project: ${escapeHtml(projName)}</strong></td><td>${formatHours(projTotal)}</td><td>${formatHours(projBillable)}</td></tr>`;
    for (const [taskName, { total, billable }] of taskMap) {
      dashboardRows += `<tr><td style="padding-left:24px;">${escapeHtml(taskName)}</td><td>${formatHours(total)}</td><td>${formatHours(billable)}</td></tr>`;
    }
  }

  // i18n labels
  const L = {
    detailedReport: lang === "en" ? "DETAILED REPORT" : "LAPORAN DETAIL",
    dashboardReport: lang === "en" ? "DASHBOARD REPORT" : "LAPORAN DASHBOARD",
    timeFrame: lang === "en" ? "Time frame" : "Rentang waktu",
    totalBillableAmount: lang === "en" ? "Total billable amount" : "Total jumlah tagihan",
    hrsOnly: lang === "en" ? "(hrs only)" : "(jam saja)",
    totalHours: lang === "en" ? "Total hours" : "Total jam",
    billableHours: lang === "en" ? "Billable hours" : "Jam tagihkan",
    day: lang === "en" ? "DAY" : "HARI",
    project: lang === "en" ? "PROJECT" : "PROYEK",
    task: lang === "en" ? "TASK" : "TUGAS",
    tags: lang === "en" ? "TAGS" : "TAG",
    billableAmount: lang === "en" ? "BILLABLE AMOUNT" : "JUMLAH TAGIHAN",
    startFinish: lang === "en" ? "START/FINISH TIME" : "MULAI/SELESAI",
    totalHoursCol: lang === "en" ? "TOTAL HOURS" : "TOTAL JAM",
    projectTask: lang === "en" ? "PROJECT/TASK" : "PROYEK/TUGAS",
    billableHoursCol: lang === "en" ? "BILLABLE HOURS" : "JAM TAGIHKAN",
    total: lang === "en" ? "TOTAL" : "TOTAL",
    generated: lang === "en" ? "Generated" : "Dibuat",
  };

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${L.detailedReport}</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #111827; font-size: 12px; }
    h1 { margin: 0 0 4px; font-size: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
    h2 { margin: 24px 0 8px; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #111; padding-bottom: 4px; }
    .muted { color: #6b7280; font-size: 11px; }
    .meta { margin: 8px 0 16px; }
    .meta-row { display: flex; gap: 32px; margin: 4px 0; }
    .meta-label { color: #6b7280; font-size: 11px; }
    .meta-value { font-weight: 600; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
    th { text-align: left; background: #111; color: #fff; padding: 6px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { border: 1px solid #e5e7eb; padding: 4px 8px; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
    .total-row td { font-weight: 700; background: #f3f4f6; border-top: 2px solid #111; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <!-- DETAILED REPORT -->
  <h1>${L.detailedReport}</h1>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">${L.timeFrame}</span><span class="meta-value">${escapeHtml(timeFrame)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalBillableAmount}</span><span class="meta-value">USD ${totalBillableAmount.toFixed(2)} ${L.hrsOnly}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalHours}</span><span class="meta-value">${formatHours(totalMinutes)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${L.day}</th>
        <th>${L.project}</th>
        <th>${L.task}</th>
        <th>${L.tags}</th>
        <th>${L.billableAmount}</th>
        <th>${L.startFinish}</th>
        <th>${L.totalHoursCol}</th>
      </tr>
    </thead>
    <tbody>
      ${detailedRows}
      <tr class="total-row">
        <td colspan="4" style="text-align:right;">${L.total}</td>
        <td>USD ${grandTotalAmount.toFixed(2)}</td>
        <td></td>
        <td>${formatHours(grandTotalMinutes)}</td>
      </tr>
    </tbody>
  </table>

  <!-- DASHBOARD REPORT -->
  <h2>${L.dashboardReport}</h2>
  <div class="meta">
    <div class="meta-row"><span class="meta-label">${L.timeFrame}</span><span class="meta-value">${escapeHtml(timeFrame)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.totalHours}</span><span class="meta-value">${formatHours(totalMinutes)}</span></div>
    <div class="meta-row"><span class="meta-label">${L.billableHours}</span><span class="meta-value">${formatHours(billableMinutes)}</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>${L.projectTask}</th>
        <th>${L.totalHoursCol}</th>
        <th>${L.billableHoursCol}</th>
      </tr>
    </thead>
    <tbody>
      ${dashboardRows}
      <tr class="total-row">
        <td>${L.total}</td>
        <td>${formatHours(totalMinutes)}</td>
        <td>${formatHours(billableMinutes)}</td>
      </tr>
    </tbody>
  </table>

  <p class="muted" style="margin-top:24px;">${L.generated} ${new Date().toLocaleString(locale)}</p>
  <script>window.print()</script>
</body>
</html>`;

  await writeActivityLog(workspaceId, user.id, "exported_va_timesheet", "time_entry");
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="va-timesheet-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}
