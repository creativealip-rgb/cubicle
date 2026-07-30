import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, projects, clients, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";

import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";
import { TasksListTable } from "@/components/tasks/tasks-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";
import { TaskBehaviorTabs } from "@/components/tasks/task-behavior-tabs";
import { defaultTaskBehavior, resolveBillingModel } from "@/lib/billing-model";
import { ActiveFilterSummary } from "@/components/ui/active-filter-summary";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    priority?: string;
    projectId?: string;
    assignee?: string;
    view?: string;
    focus?: string;
    behavior?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const currentUserId = _user.id;
  const workspaceId = await getWorkspaceId();
  const params = await searchParams;
  const view: "list" | "board" = params.view === "board" ? "board" : "list";
  const focusId = params.focus || null;

  const whereClauses = [eq(tasks.workspaceId, workspaceId)];

  if (params.behavior === "one_time") whereClauses.push(eq(tasks.behavior, "one_time"));
  else if (params.behavior === "recurring") whereClauses.push(eq(tasks.behavior, "recurring"));

  if (params.status && params.status !== "all") {
    whereClauses.push(eq(tasks.status, params.status as typeof tasks.status.enumValues[number]));
  }
  if (params.priority && params.priority !== "all") {
    whereClauses.push(eq(tasks.priority, params.priority as typeof tasks.priority.enumValues[number]));
  }
  if (params.projectId) {
    whereClauses.push(eq(tasks.projectId, params.projectId));
  }
  if (params.assignee && params.assignee !== "all") {
    if (params.assignee === "me") {
      whereClauses.push(eq(tasks.assigneeId, currentUserId));
    } else if (params.assignee === "unassigned") {
      whereClauses.push(sql`${tasks.assigneeId} IS NULL`);
    } else {
      whereClauses.push(eq(tasks.assigneeId, params.assignee));
    }
  }

  const taskList = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      position: tasks.position,
      clientVisible: tasks.clientVisible,
      projectId: tasks.projectId,
      projectName: projects.name,
      timeTrackingMode: projects.timeTrackingMode,
      clientName: clients.name,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      sourceNoteId: tasks.sourceNoteId,
      behavior: tasks.behavior,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...whereClauses))
    .orderBy(desc(tasks.createdAt));

  // Get projects for filter
  const projectList = await db
    .select({ id: projects.id, name: projects.name, billingModel: projects.billingModel, billingType: projects.billingType })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));
  const taskProjects = projectList.map((project) => ({ id: project.id, name: project.name, defaultBehavior: defaultTaskBehavior(resolveBillingModel(project)) }));

  // Get workspace members for filter + assignee selector
  const memberList = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.role);

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Tugas", "Tasks")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Pantau pekerjaan di semua proyek", "Track work across all projects")}
          </p>
        </div>
        <TaskCreateDialog projectId={params.projectId} members={memberList} projects={taskProjects} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TaskBehaviorTabs current={params.behavior} />
        <TaskViewToggle current={view} />
      </div>

      <ActiveFilterSummary basePath="/app/tasks" filters={[
        { key: "projectId", label: t("Proyek", "Project"), value: taskProjects.find((project) => project.id === params.projectId)?.name },
        { key: "assignee", label: t("Petugas", "Assignee"), value: params.assignee === "me" ? t("Saya", "Me") : params.assignee === "unassigned" ? t("Belum ditugaskan", "Unassigned") : memberList.find((member) => member.id === params.assignee)?.name },
        { key: "priority", label: t("Prioritas", "Priority"), value: params.priority },
        { key: "status", label: t("Status", "Status"), value: params.status },
      ]} />

      {/* Board view */}
      {view === "board" && <TasksBoardView tasks={taskList} members={memberList} />}

      {/* Task List */}
      {view === "list" && (
        <TasksListTable tasks={taskList} members={memberList} projects={taskProjects} currentUserId={currentUserId} currentFilters={{ status: params.status, priority: params.priority, projectId: params.projectId, assignee: params.assignee }} focusId={focusId} />
      )}
    </div>
  );
}
