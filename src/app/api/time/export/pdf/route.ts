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

export async function GET() {
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

  const totalMinutes = entries.reduce((sum, entry) => sum + Number(entry.durationMinutes ?? 0), 0);
  const billableMinutes = entries.filter((entry) => entry.billable).reduce((sum, entry) => sum + Number(entry.durationMinutes ?? 0), 0);

  const rows = entries.map((entry) => `
    <tr>
      <td>${escapeHtml(entry.date ? new Date(entry.date).toLocaleDateString("id-ID") : "—")}</td>
      <td>${escapeHtml(entry.client)}</td>
      <td>${escapeHtml(entry.project)}</td>
      <td>${escapeHtml(entry.task)}</td>
      <td>${escapeHtml(entry.description)}</td>
      <td>${escapeHtml(minutesToHours(Number(entry.durationMinutes ?? 0)))}</td>
      <td>${entry.billable ? "Yes" : "No"}</td>
      <td>${escapeHtml(entry.status)}</td>
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
  </div>
  <table>
    <thead><tr><th>Date</th><th>Client</th><th>Project</th><th>Task</th><th>Description</th><th>Time</th><th>Billable</th><th>Status</th></tr></thead>
    <tbody>${rows || "<tr><td colspan=\"8\">No time entries.</td></tr>"}</tbody>
  </table>
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
