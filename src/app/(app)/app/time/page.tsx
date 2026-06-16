import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { timeEntries, workspaces, clients, projects, tasks, users } from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { TimerWidget } from "@/components/time/timer-widget";
import { Timesheet } from "@/components/time/timesheet";
import { ManualEntryForm } from "@/components/time/manual-entry-form";
import { CsvExportButton } from "@/components/time/csv-export-button";

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export default async function TimePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  // Active timer
  const [activeTimer] = await db
    .select({
      id: timeEntries.id,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
      description: timeEntries.description,
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
      ),
    )
    .limit(1);

  // All time entries
  const entries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      durationMinutes: timeEntries.durationMinutes,
      billable: timeEntries.billable,
      startTime: timeEntries.startTime,
      endTime: timeEntries.endTime,
      status: timeEntries.status,
      clientName: clients.name,
      projectName: projects.name,
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
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  const taskList = await db
    .select({ id: tasks.id, title: tasks.title })
    .from(tasks)
    .where(eq(tasks.workspaceId, workspaceId))
    .orderBy(tasks.title)
    .limit(200);

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track time across projects</p>
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
          <CsvExportButton workspaceId={workspaceId} />
        </div>
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
          durationMinutes: e.durationMinutes,
          billable: e.billable ?? false,
          startTime: e.startTime,
          endTime: e.endTime,
          status: e.status,
          clientName: e.clientName,
          projectName: e.projectName,
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
