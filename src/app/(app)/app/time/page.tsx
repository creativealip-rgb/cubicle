import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, users } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { TimerWidget } from "@/components/time/timer-widget";
import { Timesheet } from "@/components/time/timesheet";
import { ManualEntryForm } from "@/components/time/manual-entry-form";
import { PdfExportButton } from "@/components/time/pdf-export-button";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function TimePage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  // Active timer (running only — exclude closed manual entries)
  const [activeTimer] = await db
    .select({
      id: timeEntries.id,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
      description: timeEntries.description,
      tags: timeEntries.tags,
      startTime: timeEntries.startTime,
      clientName: clients.name,
      projectName: projects.name,
      taskTitle: tasks.title,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        eq(timeEntries.userId, user.id),
        isNull(timeEntries.endTime),
        isNull(timeEntries.manualMinutes),
      ),
    )
    .limit(1);

  // All time entries
  const entries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      tags: timeEntries.tags,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      status: timeEntries.status,
      clientName: clients.name,
      projectName: projects.name,
      projectCurrency: projects.currency,
      taskTitle: tasks.title,
      userName: users.name,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(eq(timeEntries.workspaceId, workspaceId))
    .orderBy(desc(timeEntries.createdAt))
    .limit(200);

  // Clients, projects, tasks for selects
  const clientList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  const projectList = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
      billingType: projects.billingType,
      rate: projects.rate,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  const taskList = await db
    .select({ id: tasks.id, title: tasks.title, projectId: tasks.projectId })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .orderBy(tasks.title)
    .limit(200);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("Pelacakan Waktu", "Time Tracking")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Pantau waktu di semua project", "Track time across all projects")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canWrite && (
            <ManualEntryForm
              workspaceId={workspaceId}
              clients={clientList}
              projects={projectList}
              tasks={taskList}
            />
          )}
          <PdfExportButton clients={clientList} projects={projectList} />
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-medium">
          {t("Timer = jam billable", "Timer = billable hours")}
        </p>
        <p className="mt-1 text-xs text-emerald-900/80">
          {t(
            "Pakai timer / entri manual untuk jam kerja. Tugas di menu Tugas cuma checklist — tidak otomatis hitung jam. Tag opsional (Riset, Follow Up, dll) biar filter timesheet gampang.",
            "Use the timer / manual entry for work hours. Tasks are just a checklist — they don't auto-track hours. Optional tags (Research, Follow Up, etc.) make timesheet filters easier.",
          )}{" "}
          <a href="/app/tasks" className="font-medium underline underline-offset-2">
            {t("Kelola tugas", "Manage tasks")}
          </a>
        </p>
      </div>

      {/* Timer */}
      {canWrite && (
        <TimerWidget
          workspaceId={workspaceId}
          userId={user.id}
          clients={clientList}
          projects={projectList}
          tasks={taskList}
          initialTimer={
          activeTimer
            ? {
                id: activeTimer.id,
                clientId: activeTimer.clientId,
                projectId: activeTimer.projectId,
                taskId: activeTimer.taskId,
                description: activeTimer.description,
                startTime: activeTimer.startTime!,
                clientName: activeTimer.clientName,
                projectName: activeTimer.projectName,
                taskTitle: activeTimer.taskTitle,
              }
            : null
          }
        />
      )}

      {/* Timesheet */}
      <Timesheet
        entries={entries.map((e) => ({
          id: e.id,
          description: e.description,
          tags: e.tags,
          durationMinutes: e.durationMinutes,
          billable: e.billable ?? false,
          hourlyRate: e.hourlyRate,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.status,
          clientName: e.clientName,
          projectName: e.projectName,
          projectCurrency: e.projectCurrency,
          taskTitle: e.taskTitle,
          userName: e.userName,
          createdAt: e.createdAt,
        }))}
        clients={clientList}
        projects={projectList}
      />
    </div>
  );
}
