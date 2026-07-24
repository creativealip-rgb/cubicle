import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, projects, clients, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";
import { TasksListTable } from "@/components/tasks/tasks-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";

function buildTasksHref(filters: {
  status?: string;
  priority?: string;
  projectId?: string;
  assignee?: string;
  view?: string;
}) {
  const params = new URLSearchParams();
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.assignee && filters.assignee !== "all") params.set("assignee", filters.assignee);
  if (filters.view && filters.view !== "list") params.set("view", filters.view);
  return `/app/tasks${params.toString() ? `?${params.toString()}` : ""}`;
}

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
      clientName: clients.name,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      sourceNoteId: tasks.sourceNoteId,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(and(...whereClauses))
    .orderBy(desc(tasks.createdAt));

  // Get projects for filter
  const projectList = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));

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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Tugas", "Tasks")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Pantau pekerjaan di semua proyek", "Track work across all projects")}
          </p>
        </div>
        <TaskCreateDialog projectId={params.projectId} members={memberList} projects={projectList} />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-3 py-2.5 text-sm text-blue-950 sm:px-4 sm:py-3">
        <p className="font-medium">
          {t("Tugas dan Timer terpisah", "Tasks and Timer are separate")}
        </p>
        <p className="mt-1 text-xs text-blue-900/80">
          {t(
            "Tugas buat status kerja. Timer buat jam billable. Buka tugas lalu mulai timer kalau mau catat waktu.",
            "Tasks track work status. Timer tracks billable hours. Open a task, then start timer when you want to log time.",
          )}{" "}
          <a href="/app/time" className="font-medium underline underline-offset-2">
            {t("Buka Time Tracking", "Open Time Tracking")}
          </a>
        </p>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <TaskFilters
            projects={projectList}
            members={memberList}
            currentUserId={currentUserId}
            current={{
              status: params.status,
              priority: params.priority,
              projectId: params.projectId,
              assignee: params.assignee === currentUserId ? "me" : params.assignee,
            }}
          />
        </div>
        <TaskViewToggle current={view} />
      </div>

      {/* Board view */}
      {view === "board" && <TasksBoardView tasks={taskList} members={memberList} />}

      {/* Task List */}
      {view === "list" && (
        <TasksListTable tasks={taskList} members={memberList} focusId={focusId} />
      )}
    </div>
  );
}
