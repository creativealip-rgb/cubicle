import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, users, activities, projectActivities } from "@/db/schema";
import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { TimerWidget } from "@/components/time/timer-widget";
import { Timesheet } from "@/components/time/timesheet";
import { TeamTimesheetView } from "@/components/time/team-timesheet-view";
import { WeeklyTimeGrid } from "@/components/time/weekly-time-grid";
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

  // Active timer (running/paused — exclude closed manual entries)
  const [activeTimer] = await db
    .select({
      id: timeEntries.id,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      activityId: timeEntries.activityId,
      taskId: timeEntries.taskId,
      description: timeEntries.description,
      tags: timeEntries.tags,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      pausedAt: timeEntries.pausedAt,
      durationMinutes: timeEntries.durationMinutes,
      manualMinutes: timeEntries.manualMinutes,
      status: timeEntries.status,
      clientName: clients.name,
      projectName: projects.name,
      activityName: activities.name,
      taskTitle: tasks.title,
      userName: users.name,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(activities, eq(activities.id, timeEntries.activityId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
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
      manualMinutes: timeEntries.manualMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      status: timeEntries.status,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      activityId: timeEntries.activityId,
      taskId: timeEntries.taskId,
      userId: timeEntries.userId,
      clientName: clients.name,
      projectName: projects.name,
      projectCurrency: projects.currency,
      projectTimeTrackingMode: projects.timeTrackingMode,
      activityName: activities.name,
      taskTitle: tasks.title,
      userName: users.name,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(activities, eq(activities.id, timeEntries.activityId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(eq(timeEntries.workspaceId, workspaceId), isNotNull(timeEntries.endTime)))
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
      timeTrackingMode: projects.timeTrackingMode,
      activityRequired: projects.activityRequired,
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

  const activityList = await db
    .select({
      id: activities.id,
      name: activities.name,
      projectId: projectActivities.projectId,
      enabled: projectActivities.enabled,
      status: activities.status,
      defaultHourlyRate: activities.defaultHourlyRate,
      rateOverride: projectActivities.rateOverride,
    })
    .from(projectActivities)
    .innerJoin(
      activities,
      and(
        eq(activities.id, projectActivities.activityId),
        eq(activities.workspaceId, projectActivities.workspaceId),
      ),
    )
    .where(
      and(
        eq(projectActivities.workspaceId, workspaceId),
        eq(projectActivities.enabled, true),
        eq(activities.status, "active"),
      ),
    )
    .orderBy(activities.name);

  const writableProjectList = projectList.filter((project) => project.timeTrackingMode !== "off");
  const writableProjectIds = new Set(writableProjectList.map((project) => project.id));
  const writableTaskList = taskList.filter((task) => task.projectId && writableProjectIds.has(task.projectId));
  const teamEntries = [
    ...entries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      clientName: entry.clientName,
      projectName: entry.projectName,
      activityName: entry.activityName,
      taskTitle: entry.taskTitle,
      userName: entry.userName,
      startTime: entry.startTime,
      endTime: entry.endTime,
      pausedAt: null,
      durationMinutes: entry.durationMinutes,
      manualMinutes: entry.manualMinutes,
      status: entry.status,
    })),
    ...(activeTimer
      ? [{
          id: activeTimer.id,
          description: activeTimer.description,
          clientName: activeTimer.clientName,
          projectName: activeTimer.projectName,
          activityName: activeTimer.activityName,
          taskTitle: activeTimer.taskTitle,
          userName: activeTimer.userName,
          startTime: activeTimer.startTime,
          endTime: activeTimer.endTime,
          pausedAt: activeTimer.pausedAt,
          durationMinutes: activeTimer.durationMinutes,
          manualMinutes: activeTimer.manualMinutes,
          status: activeTimer.status,
        }]
      : []),
  ];

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Pelacakan Waktu", "Time Tracking")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("Pantau waktu di semua project", "Track time across all projects")}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {canWrite && (
            <ManualEntryForm
              workspaceId={workspaceId}
              clients={clientList}
              projects={writableProjectList}
              tasks={writableTaskList}
              activities={activityList}
            />
          )}
          <PdfExportButton clients={clientList} projects={projectList} />
        </div>
      </div>

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3 text-sm text-emerald-950">
        <p className="font-medium">
          {t("Tugas dan Timer terpisah", "Tasks and Timer are separate")}
        </p>
        <p className="mt-1 text-xs text-emerald-900/80">
          {t(
            "Tugas buat status kerja. Timer buat jam billable. Buka tugas lalu mulai timer kalau mau catat waktu.",
            "Tasks track work status. Timer tracks billable hours. Open a task then start a timer when you want to log time.",
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
          projects={writableProjectList}
          tasks={writableTaskList}
          activities={activityList}
          initialTimer={
          activeTimer
            ? {
                id: activeTimer.id,
                clientId: activeTimer.clientId,
                projectId: activeTimer.projectId,
                activityId: activeTimer.activityId,
                taskId: activeTimer.taskId,
                description: activeTimer.description,
                tags: activeTimer.tags,
                startTime: activeTimer.startTime!,
                pausedAt: activeTimer.pausedAt,
                clientName: activeTimer.clientName,
                projectName: activeTimer.projectName,
                activityName: activeTimer.activityName,
                taskTitle: activeTimer.taskTitle,
              }
            : null
          }
        />
      )}

      <TeamTimesheetView entries={teamEntries} />

      <WeeklyTimeGrid
        entries={entries
          .filter((entry) => entry.userId === user.id)
          .map((entry) => ({
            id: entry.id,
            projectId: entry.projectId,
            projectName: entry.projectName,
            taskId: entry.taskId,
            taskTitle: entry.taskTitle,
            startTime: entry.startTime,
            durationMinutes: entry.durationMinutes,
            manualMinutes: entry.manualMinutes,
            tags: entry.tags,
            status: entry.status,
          }))}
        projects={writableProjectList.map((project) => ({ id: project.id, name: project.name }))}
        tasks={writableTaskList}
        canWrite={canWrite}
      />

      {/* Timesheet */}
      <Timesheet
        entries={entries.map((e) => ({
          id: e.id,
          description: e.description,
          tags: e.tags,
          durationMinutes: e.durationMinutes,
          manualMinutes: e.manualMinutes,
          billable: e.billable ?? false,
          hourlyRate: e.hourlyRate,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.status,
          clientId: e.clientId,
          projectId: e.projectId,
          activityId: e.activityId,
          taskId: e.taskId,
          clientName: e.clientName,
          projectName: e.projectName,
          activityName: e.activityName,
          projectCurrency: e.projectCurrency,
          projectTimeTrackingMode: e.projectTimeTrackingMode,
          taskTitle: e.taskTitle,
          userName: e.userName,
          createdAt: e.createdAt,
        }))}
        clients={clientList}
        projects={projectList}
        tasks={taskList}
        activities={activityList}
      />
    </div>
  );
}
