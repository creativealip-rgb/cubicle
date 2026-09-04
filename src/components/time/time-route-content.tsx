import { getCurrentLang, createT } from "@/lib/i18n";
import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, clients, projects, tasks, users, activities, projectActivities, timesheetSubmissions } from "@/db/schema";
import { eq, and, isNull, isNotNull, desc, gte, lt, or } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { TimerWidget } from "@/components/time/timer-widget";
import { Timesheet } from "@/components/time/timesheet";
import { WeeklyTimeGrid } from "@/components/time/weekly-time-grid";
import { PdfExportButton } from "@/components/time/pdf-export-button";
import Link from "next/link";

import { TimePageShell } from "@/components/time/time-header";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Briefcase, Zap } from "lucide-react";

function formatDurationMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
import { TimesheetApprovalPanel } from "@/components/time/timesheet-approval-panel";
import { weekStartIso } from "@/lib/timesheet-approval";
import { uniqueRecentTimerCombinations } from "@/lib/timer-combinations";
import { AddTimeLogDialog } from "@/components/time/add-time-log-dialog";
import { NewTimerDialog } from "@/components/time/new-timer-dialog";
import { ActiveTimerCard } from "@/components/time/active-timer-card";
import { WaktuNavigation } from "@/components/time/waktu-navigation";
import { effectiveWorkDateSql, shiftDateIso, weekStartDate, localDateIso } from "@/lib/effective-work-date";
import { allowsTimeTrackingProject } from "@/lib/billing-model";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export async function TimeRouteContent({ mode, view = "daily", selectedDate = localDateIso(new Date()), action }: { mode: "timer" | "timesheet" | "history" | "approvals"; view?: "daily" | "weekly"; selectedDate?: string; action?: string }) {

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

  const selectedStart = view === "weekly" ? localDateIso(weekStartDate(new Date(`${selectedDate}T12:00:00`))) : selectedDate;
  const selectedEnd = shiftDateIso(selectedStart, view === "weekly" ? 7 : 1);

  // Current-user entries scoped to selected work-date period.
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
      workDate: timeEntries.workDate,
    })
    .from(timeEntries)
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(activities, eq(activities.id, timeEntries.activityId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(and(eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.userId, user.id), or(isNotNull(timeEntries.endTime), isNotNull(timeEntries.manualMinutes)), gte(effectiveWorkDateSql(timeEntries), selectedStart), lt(effectiveWorkDateSql(timeEntries), selectedEnd)))
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
      billingModel: projects.billingModel,
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
    .where(and(eq(tasks.workspaceId, workspaceId), eq(tasks.mode, "reusable"), eq(tasks.lifecycle, "active")))
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

  const writableProjectList = projectList.filter(
    (project) => project.timeTrackingMode !== "off" && allowsTimeTrackingProject(project),
  );
  const writableProjectIds = new Set(writableProjectList.map((project) => project.id));
  const writableTaskList = taskList.filter((task) => task.projectId && writableProjectIds.has(task.projectId));
  const recentTimerCombinations = uniqueRecentTimerCombinations(
    entries
      .filter((entry) => entry.projectId)
      .map((entry) => ({
        clientId: entry.clientId,
        projectId: entry.projectId!,
        activityId: entry.activityId,
        taskId: entry.taskId,
        description: entry.description,
        tags: entry.tags,
      })),
  );

  const currentWeekStart = weekStartIso(new Date());
  const approvalRows = await db.select({ id: timesheetSubmissions.id, userId: timesheetSubmissions.userId, userName: users.name, weekStart: timesheetSubmissions.weekStart, status: timesheetSubmissions.status, totalMinutes: timesheetSubmissions.totalMinutes, billableMinutes: timesheetSubmissions.billableMinutes, submitterNote: timesheetSubmissions.submitterNote, reviewNote: timesheetSubmissions.reviewNote }).from(timesheetSubmissions).leftJoin(users, eq(users.id, timesheetSubmissions.userId)).where(eq(timesheetSubmissions.workspaceId, workspaceId)).orderBy(desc(timesheetSubmissions.submittedAt)).limit(50);
  const currentApproval = approvalRows.find((item) => item.userId === user.id && item.weekStart === currentWeekStart) ?? null;
  const pendingApprovals = member.role === "owner" ? approvalRows.filter((item) => item.status === "submitted") : [];

  const primaryActions = canWrite ? (
    <>
      <AddTimeLogDialog workspaceId={workspaceId} clients={clientList} projects={writableProjectList.map((p) => ({ id: p.id, name: p.name, customerRef: p.clientId, billingType: p.billingType, rate: p.rate }))} tasks={writableTaskList.map((t) => ({ id: t.id, title: t.title, projectRef: t.projectId }))} />
      <NewTimerDialog initialOpen={action === "timer"} workspaceId={workspaceId} projects={writableProjectList.map((p) => ({ id: p.id, name: p.name, customerRef: p.clientId }))} tasks={writableTaskList.map((t) => ({ id: t.id, title: t.title, projectRef: t.projectId }))} />
    </>
  ) : null;

  const totalPeriodMinutes = entries.reduce((acc, curr) => acc + (curr.durationMinutes || curr.manualMinutes || 0), 0);
  const billablePeriodMinutes = entries.filter((e) => e.billable).reduce((acc, curr) => acc + (curr.durationMinutes || curr.manualMinutes || 0), 0);
  const billableRate = totalPeriodMinutes > 0 ? Math.round((billablePeriodMinutes / totalPeriodMinutes) * 100) : 100;

  return (
    <TimePageShell actions={primaryActions}>
      {/* 3-KPI Work Hours Summary Banner */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {view === "weekly" ? t("Total Jam Mingguan", "Weekly Tracked") : t("Total Jam Terpilih", "Tracked Hours")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-foreground tabular-nums">
                {formatDurationMinutes(totalPeriodMinutes)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {entries.length} {t("log tercatat", "entries logged")}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Jam Billable", "Billable Ratio")}
              </p>
              <p className="mt-0.5 text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
                {billableRate}% <span className="text-xs font-normal text-muted-foreground">({formatDurationMinutes(billablePeriodMinutes)})</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t("Dapat ditagihkan ke klien", "Billable to clients")}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Briefcase className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-3.5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {t("Status Tracker", "Tracker Status")}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block h-2 w-2 rounded-full ${activeTimer ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"}`} />
                <span className="text-sm font-bold text-foreground">
                  {activeTimer ? (activeTimer.projectName || t("Timer Aktif", "Timer Running")) : t("Siap Digunakan", "Ready")}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {activeTimer ? (activeTimer.taskTitle || activeTimer.description || t("Melacak durasi...", "Tracking...")) : t("Mulai timer atau log manual", "Start timer or log manual")}
              </p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-violet-500/10 text-violet-600 flex items-center justify-center shrink-0">
              <Zap className="h-4 w-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {mode === "timer" && (
        <>
          {canWrite && <TimerWidget workspaceId={workspaceId} userId={user.id} clients={clientList} projects={writableProjectList} tasks={writableTaskList} activities={activityList} recentCombinations={recentTimerCombinations} initialTimer={activeTimer ? { id: activeTimer.id, clientId: activeTimer.clientId, projectId: activeTimer.projectId, activityId: activeTimer.activityId, taskId: activeTimer.taskId, description: activeTimer.description, tags: activeTimer.tags, startTime: activeTimer.startTime!, pausedAt: activeTimer.pausedAt, clientName: activeTimer.clientName, projectName: activeTimer.projectName, activityName: activeTimer.activityName, taskTitle: activeTimer.taskTitle } : null} />}
          <section aria-labelledby="recent-time-heading">
            <div className="mb-3 flex items-center justify-between"><h2 id="recent-time-heading" className="text-base font-semibold">{t("Hari ini", "Today")}</h2><Link href="/app/time/history" className="text-sm font-medium text-primary hover:underline">{t("Lihat semua di Riwayat", "View all in History")}</Link></div>
            <Timesheet entries={entries.slice(0, 3).map((e) => ({ id: e.id, description: e.description, tags: e.tags, durationMinutes: e.durationMinutes, manualMinutes: e.manualMinutes, billable: e.billable ?? false, hourlyRate: e.hourlyRate, workDate: e.workDate, startTime: e.startTime, endTime: e.endTime, status: e.status, clientId: e.clientId, projectId: e.projectId, activityId: e.activityId, taskId: e.taskId, clientName: e.clientName, projectName: e.projectName, activityName: e.activityName, projectCurrency: e.projectCurrency, projectTimeTrackingMode: e.projectTimeTrackingMode, billingType: projectList.find((project) => project.id === e.projectId)?.billingType, taskTitle: e.taskTitle, userName: e.userName, createdAt: e.createdAt }))} clients={clientList} projects={projectList} tasks={taskList} activities={activityList} />
          </section>
        </>
      )}
      {mode === "timesheet" && (
        <>
          <WaktuNavigation view="weekly" selectedDate={selectedDate} actions={<PdfExportButton clients={clientList} projects={projectList} />} />
          <WeeklyTimeGrid
            selectedDate={selectedDate}
            entries={entries.map((entry) => ({
              id: entry.id,
              projectId: entry.projectId,
              projectName: entry.projectName,
              taskId: entry.taskId,
              taskTitle: entry.taskTitle,
              description: entry.description,
              workDate: entry.workDate,
              startTime: entry.startTime,
              endTime: entry.endTime,
              createdAt: entry.createdAt,
              durationMinutes: entry.durationMinutes,
              manualMinutes: entry.manualMinutes,
              tags: entry.tags,
              status: entry.status,
              billable: entry.billable ?? false,
              clientId: entry.clientId,
              clientName: entry.clientName,
            }))}
            clients={clientList}
            projects={projectList}
            tasks={taskList}
            canWrite={canWrite}
          />
        </>
      )}
      {mode === "history" && (
        <>
          <WaktuNavigation view="daily" selectedDate={selectedDate} actions={<PdfExportButton clients={clientList} projects={projectList} />} />
          <ActiveTimerCard initialTimer={activeTimer ? { id: activeTimer.id, clientId: activeTimer.clientId, projectId: activeTimer.projectId, taskId: activeTimer.taskId, projectName: activeTimer.projectName, taskTitle: activeTimer.taskTitle, description: activeTimer.description, startTime: activeTimer.startTime!, pausedAt: activeTimer.pausedAt } : null} clients={clientList} projects={writableProjectList} tasks={writableTaskList} />
          <Timesheet compact entries={entries.map((e) => ({ id: e.id, description: e.description, tags: e.tags, durationMinutes: e.durationMinutes, manualMinutes: e.manualMinutes, billable: e.billable ?? false, hourlyRate: e.hourlyRate, workDate: e.workDate, startTime: e.startTime, endTime: e.endTime, status: e.status, clientId: e.clientId, projectId: e.projectId, activityId: e.activityId, taskId: e.taskId, clientName: e.clientName, projectName: e.projectName, activityName: e.activityName, projectCurrency: e.projectCurrency, projectTimeTrackingMode: e.projectTimeTrackingMode, billingType: projectList.find((project) => project.id === e.projectId)?.billingType, taskTitle: e.taskTitle, userName: e.userName, createdAt: e.createdAt }))} clients={clientList} projects={projectList} tasks={taskList} activities={activityList} />
        </>
      )}
      {mode === "approvals" && <TimesheetApprovalPanel weekStart={currentWeekStart} current={currentApproval} pending={pendingApprovals} isOwner={member.role === "owner"} />}
    </TimePageShell>
  );
}
