import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers, cookies } from "next/headers";
import { db } from "@/db";
import { clients, projects, tasks, timeEntries, users } from "@/db/schema";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { writeActivityLog } from "@/lib/actions/activity";
import { and, desc, eq } from "drizzle-orm";

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function minutesToHours(minutes: number | null) {
  return `${Math.round(((minutes ?? 0) / 60) * 100) / 100}h`;
}

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

  // i18n labels
  const L = {
    title: lang === "en" ? "Timesheet Export" : "Ekspor Timesheet",
    generated: lang === "en" ? "Generated" : "Dibuat",
    entries: lang === "en" ? "Entries" : "Entri",
    total: lang === "en" ? "Total" : "Total",
    billable: lang === "en" ? "Billable" : "Tagihkan",
    billableAmount: lang === "en" ? "Billable Amount" : "Jumlah Tagihan",
    dashboardReport: lang === "en" ? "Dashboard Report" : "Laporan Dashboard",
    projectHours: lang === "en" ? "Project (Hours)" : "Proyek (Jam)",
    project: lang === "en" ? "Project" : "Proyek",
    totalHours: lang === "en" ? "Total Hours" : "Total Jam",
    taskTagHours: lang === "en" ? "Task / Tags (Hours)" : "Tugas / Tag (Jam)",
    taskTag: lang === "en" ? "Task / Tag" : "Tugas / Tag",
    detailedReport: lang === "en" ? "Detailed Report" : "Laporan Detail",
    hari: lang === "en" ? "Day" : "Hari",
    user: lang === "en" ? "User" : "User",
    client: lang === "en" ? "Client" : "Klien",
    task: lang === "en" ? "Task" : "Tugas",
    tags: lang === "en" ? "Tags" : "Tag",
    description: lang === "en" ? "Description" : "Deskripsi",
    start: lang === "en" ? "Start" : "Mulai",
    finish: lang === "en" ? "Finish" : "Selesai",
    billableCol: lang === "en" ? "Billable" : "Tagihkan",
    billableAmountCol: lang === "en" ? "Billable Amount" : "Jumlah Tagihan",
    noData: lang === "en" ? "No data." : "Tidak ada data.",
    noEntries: lang === "en" ? "No time entries." : "Tidak ada entri waktu.",
    yes: lang === "en" ? "Yes" : "Ya",
    no: lang === "en" ? "No" : "Tidak",
    unassigned: lang === "en" ? "Unassigned" : "Belum ditugaskan",
    noProject: lang === "en" ? "No project" : "Tanpa proyek",
    untagged: lang === "en" ? "Untagged" : "Tanpa tag",
  };

  const entries = await db
    .select({
      date: timeEntries.startTime,
      client: clients.name,
      project: projects.name,
      task: tasks.title,
      description: timeEntries.description,
      tags: timeEntries.tags,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      user: users.name,
      status: timeEntries.status,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(eq(timeEntries.workspaceId, workspaceId)))
    .orderBy(desc(timeEntries.startTime))
    .limit(500);

  const url = new URL(request.url);
  const includeDashboard = url.searchParams.get("dashboard") !== "0";
  const includeDetailed = url.searchParams.get("detailed") !== "0";

  const totalMinutes = entries.reduce((sum, entry) => sum + Number(entry.durationMinutes ?? 0), 0);
  const billableMinutes = entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + Number(entry.durationMinutes ?? 0), 0);
  const totalBillableAmount = entries.reduce((sum, entry) => {
    if (!entry.billable) return sum;
    const rate = Number(entry.hourlyRate ?? 0);
    return sum + (Number(entry.durationMinutes ?? 0) / 60) * rate;
  }, 0);

  function addSummary(map: Map<string, number>, key: string, minutes: number) {
    map.set(key || L.unassigned, (map.get(key || L.unassigned) ?? 0) + minutes);
  }

  const projectSummary = new Map<string, number>();
  const tagSummary = new Map<string, number>();
  for (const entry of entries) {
    const minutes = Number(entry.durationMinutes ?? 0);
    addSummary(projectSummary, entry.project || L.noProject, minutes);
    String(entry.tags || L.untagged)
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .forEach((tag) => addSummary(tagSummary, tag, minutes));
  }

  const summaryRows = (map: Map<string, number>) => Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([label, minutes]) => `
      <tr><td>${escapeHtml(label)}</td><td>${minutesToHours(minutes)}</td><td>${totalMinutes ? Math.round((minutes / totalMinutes) * 100) : 0}%</td></tr>
    `).join("");

  const rows = entries.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.date ? new Date(entry.date).toLocaleDateString(locale) : "—")}</td>
      <td>${escapeHtml(entry.client)}</td>
      <td>${escapeHtml(entry.project)}</td>
      <td>${escapeHtml(entry.task)}</td>
      <td>${escapeHtml(entry.tags)}</td>
      <td>${escapeHtml(entry.description)}</td>
      <td>${escapeHtml(entry.startTime ? new Date(entry.startTime).toLocaleString(locale) : "—")}</td>
      <td>${escapeHtml(entry.endTime ? new Date(entry.endTime).toLocaleString(locale) : "—")}</td>
      <td>${escapeHtml(minutesToHours(Number(entry.durationMinutes ?? 0)))}</td>
      <td>${entry.billable ? L.yes : L.no}</td>
      <td>${entry.billable ? escapeHtml(((Number(entry.durationMinutes ?? 0) / 60) * Number(entry.hourlyRate ?? 0)).toLocaleString(locale)) : "—"}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${L.title}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #111827; }
    h1 { margin: 0; font-size: 24px; }
    .muted { color: #6b7280; font-size: 12px; }
    .summary { display: flex; gap: 12px; margin: 20px 0; }
    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; min-width: 130px; }
    .card strong { display: block; font-size: 20px; }
    .section { margin-top: 22px; page-break-inside: avoid; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th { text-align: left; background: #f3f4f6; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; vertical-align: top; }
    tr:nth-child(even) { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${L.title}</h1>
  <p class="muted">${L.generated} ${escapeHtml(new Date().toLocaleString(locale))}</p>
  <div class="summary">
    <div class="card"><span class="muted">${L.entries}</span><strong>${entries.length}</strong></div>
    <div class="card"><span class="muted">${L.total}</span><strong>${minutesToHours(totalMinutes)}</strong></div>
    <div class="card"><span class="muted">${L.billable}</span><strong>${minutesToHours(billableMinutes)}</strong></div>
    <div class="card"><span class="muted">${L.billableAmount}</span><strong>${escapeHtml(totalBillableAmount.toLocaleString(locale))}</strong></div>
  </div>
  ${includeDashboard ? `<div class="section"><h2>${L.dashboardReport}</h2><h3>${L.projectHours}</h3><table><thead><tr><th>${L.project}</th><th>${L.totalHours}</th><th>%</th></tr></thead><tbody>${summaryRows(projectSummary) || `<tr><td colspan="3">${L.noData}</td></tr>`}</tbody></table><h3>${L.taskTagHours}</h3><table><thead><tr><th>${L.taskTag}</th><th>${L.totalHours}</th><th>%</th></tr></thead><tbody>${summaryRows(tagSummary) || `<tr><td colspan="3">${L.noData}</td></tr>`}</tbody></table></div>` : ""}
  ${includeDetailed ? `<div class="section"><h2>${L.detailedReport}</h2><table><thead><tr><th>${L.hari}</th><th>${L.user}</th><th>${L.client}</th><th>${L.project}</th><th>${L.task}</th><th>${L.tags}</th><th>${L.description}</th><th>${L.start}</th><th>${L.finish}</th><th>${L.totalHours}</th><th>${L.billableCol}</th><th>${L.billableAmountCol}</th></tr></thead><tbody>${rows || `<tr><td colspan="12">${L.noEntries}</td></tr>`}</tbody></table></div>` : ""}
  <script>window.print()</script>
</body>
</html>`;

  await writeActivityLog(workspaceId, user.id, "exported_time_pdf", "time_entry");
  return new NextResponse(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-disposition": `inline; filename="timesheet-${new Date().toISOString().split("T")[0]}.html"`,
    },
  });
}
