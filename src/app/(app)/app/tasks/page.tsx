import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { taskTemplateItems, taskTemplates, tasks, projects, clients, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";
import { TasksListTable } from "@/components/tasks/tasks-list-table";
import { TaskPageTabs } from "@/components/tasks/task-page-tabs";
import { TaskTemplateWorkspace } from "@/components/tasks/task-template-workspace";
import { ActiveFilterSummary } from "@/components/ui/active-filter-summary";
import { resolveBillingModel } from "@/lib/billing-model";
import { defaultTaskWorkMode } from "@/lib/task-work-mode";

export const PAGE_SIZE = 10;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ tab?: string; status?: string; priority?: string; projectId?: string; assignee?: string; view?: string; focus?: string; mode?: string; page?: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const params = await searchParams;
  const tab = params.tab === "templates" ? "templates" : "tasks";
  const view = params.view === "board" ? "board" : "list";
  const page = Math.max(1, Number(params.page) || 1);
  const whereClauses = [eq(tasks.workspaceId, workspaceId)];
  if (params.mode === "workflow" || params.mode === "reusable") whereClauses.push(eq(tasks.mode, params.mode));
  if (params.status && params.status !== "all") whereClauses.push(eq(tasks.status, params.status as typeof tasks.status.enumValues[number]));
  if (params.priority && params.priority !== "all") whereClauses.push(eq(tasks.priority, params.priority as typeof tasks.priority.enumValues[number]));
  if (params.projectId) whereClauses.push(eq(tasks.projectId, params.projectId));
  if (params.assignee === "me") whereClauses.push(eq(tasks.assigneeId, user.id));
  else if (params.assignee === "unassigned") whereClauses.push(sql`${tasks.assigneeId} IS NULL`);
  else if (params.assignee && params.assignee !== "all") whereClauses.push(eq(tasks.assigneeId, params.assignee));

  const taskList = await db.select({ id: tasks.id, title: tasks.title, description: tasks.description, status: tasks.status, priority: tasks.priority, dueDate: tasks.dueDate, position: tasks.position, clientVisible: tasks.clientVisible, projectId: tasks.projectId, projectName: projects.name, timeTrackingMode: projects.timeTrackingMode, clientName: clients.name, assigneeId: tasks.assigneeId, assigneeName: users.name, sourceNoteId: tasks.sourceNoteId, behavior: tasks.behavior, mode: tasks.mode, lifecycle: tasks.lifecycle }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).leftJoin(clients, eq(clients.id, projects.clientId)).leftJoin(users, eq(users.id, tasks.assigneeId)).where(and(...whereClauses)).orderBy(desc(tasks.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const projectRows = await db.select({ id: projects.id, name: projects.name, billingModel: projects.billingModel, billingType: projects.billingType }).from(projects).where(eq(projects.workspaceId, workspaceId));
  const writableProjectRows = projectRows.filter((project) => resolveBillingModel(project) !== "legacy_package");
  const taskProjects = writableProjectRows.map((project) => ({ id: project.id, name: project.name, defaultBehavior: defaultTaskWorkMode(resolveBillingModel(project)) === "workflow" ? "one_time" as const : "recurring" as const }));
  const members = await db.select({ id: users.id, name: users.name, email: users.email }).from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, workspaceId));
  const templateRows = await db.select().from(taskTemplates).where(eq(taskTemplates.workspaceId, workspaceId)).orderBy(desc(taskTemplates.updatedAt));
  const itemRows = await db.select().from(taskTemplateItems).where(eq(taskTemplateItems.workspaceId, workspaceId));
  const templates = templateRows.map((template) => ({ ...template, items: itemRows.filter((item) => item.templateId === template.id) }));

  return <div className="min-w-0 space-y-6">
    <div className="app-page-header"><div><h1 className="app-page-title">Tugas</h1><p className="mt-1 text-sm text-muted-foreground">Kelola pekerjaan proyek dan template reusable.</p></div>{tab === "tasks" ? <TaskCreateDialog projectId={params.projectId} members={members} projects={taskProjects} /> : null}</div>
    <TaskPageTabs current={tab} />
    {tab === "templates" ? <TaskTemplateWorkspace templates={templates} projects={taskProjects} /> : <>
      <ActiveFilterSummary basePath="/app/tasks" filters={[{ key: "projectId", label: "Proyek", value: taskProjects.find((project) => project.id === params.projectId)?.name }, { key: "assignee", label: "Petugas", value: params.assignee }, { key: "priority", label: "Prioritas", value: params.priority }, { key: "status", label: "Status", value: params.status }]} />
      {view === "board" ? <TasksBoardView tasks={taskList.map((task) => ({ ...task, projectId: task.projectId ?? undefined }))} members={members} /> : <TasksListTable tasks={taskList} members={members} projects={taskProjects} currentUserId={user.id} currentFilters={{ status: params.status, priority: params.priority, projectId: params.projectId, assignee: params.assignee }} focusId={params.focus ?? null} />}
    </>}
  </div>;
}
