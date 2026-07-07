import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
    map.set(key || "Unassigned", (map.get(key || "Unassigned") ?? 0) + minutes);
  }

  const projectSummary = new Map<string, number>();
  const tagSummary = new Map<string, number>();
  for (const entry of entries) {
    const minutes = Number(entry.durationMinutes ?? 0);
    addSummary(projectSummary, entry.project || "No project", minutes);
    String(entry.tags || "Untagged")
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
      <td>${escapeHtml(entry.date ? new Date(entry.date).toLocaleDateString("id-ID") : "—")}</td>
      <td>${escapeHtml(entry.client)}</td>
      <td>${escapeHtml(entry.project)}</td>
      <td>${escapeHtml(entry.task)}</td>
      <td>${escapeHtml(entry.tags)}</td>
      <td>${escapeHtml(entry.description)}</td>
      <td>${escapeHtml(entry.startTime ? new Date(entry.startTime).toLocaleString("id-ID") : "—")}</td>
      <td>${escapeHtml(entry.endTime ? new Date(entry.endTime).toLocaleString("id-ID") : "—")}</td>
      <td>${escapeHtml(minutesToHours(Number(entry.durationMinutes ?? 0)))}</td>
      <td>${entry.billable ? "Yes" : "No"}</td>
      <td>${entry.billable ? escapeHtml(((Number(entry.durationMinutes ?? 0) / 60) * Number(entry.hourlyRate ?? 0)).toLocaleString("id-ID")) : "—"}</td>
    </tr>
  `).join("");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Timesheet Export</title>
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
  <h1>Timesheet Export</h1>
  <p class="muted">Generated ${escapeHtml(new Date().toLocaleString("id-ID"))}</p>
  <div class="summary">
    <div class="card"><span class="muted">Entries</span><strong>${entries.length}</strong></div>
    <div class="card"><span class="muted">Total</span><strong>${minutesToHours(totalMinutes)}</strong></div>
    <div class="card"><span class="muted">Billable</span><strong>${minutesToHours(billableMinutes)}</strong></div>
    <div class="card"><span class="muted">Billable Amount</span><strong>${escapeHtml(totalBillableAmount.toLocaleString("id-ID"))}</strong></div>
  </div>
  ${includeDashboard ? `<div class="section"><h2>Dashboard Report</h2><h3>Project (Hours)</h3><table><thead><tr><th>Project</th><th>Total Hours</th><th>%</th></tr></thead><tbody>${summaryRows(projectSummary) || "<tr><td colspan=\"3\">No data.</td></tr>"}</tbody></table><h3>Task / Tags (Hours)</h3><table><thead><tr><th>Task / Tag</th><th>Total Hours</th><th>%</th></tr></thead><tbody>${summaryRows(tagSummary) || "<tr><td colspan=\"3\">No data.</td></tr>"}</tbody></table></div>` : ""}
  ${includeDetailed ? `<div class="section"><h2>Detailed Report</h2><table><thead><tr><th>Hari</th><th>User</th><th>Client</th><th>Project</th><th>Task</th><th>Tags</th><th>Description</th><th>Start</th><th>Finish</th><th>Total Hours</th><th>Billable</th><th>Billable Amount</th></tr></thead><tbody>${rows || "<tr><td colspan=\"12\">No time entries.</td></tr>"}</tbody></table></div>` : ""}
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
