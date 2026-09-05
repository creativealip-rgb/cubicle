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
import { TasksWeeklyTracker } from "@/components/tasks/tasks-weekly-tracker";
import { TaskPageTabs } from "@/components/tasks/task-page-tabs";
import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import { TaskTemplateWorkspace } from "@/components/tasks/task-template-workspace";
import { ActiveFilterSummary } from "@/components/ui/active-filter-summary";
import { resolveBillingModel } from "@/lib/billing-model";
import { defaultTaskWorkMode } from "@/lib/task-work-mode";
import { getCurrentLang, createT } from "@/lib/i18n";
import { PageHeader } from "@/components/ui/page-header";
import { CheckSquare, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export const PAGE_SIZE = 10;

function buildTaskPageHref(params: Record<string, string | undefined>, page: number) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value && key !== "page") next.set(key, value);
  next.set("page", String(page));
  return `/app/tasks?${next.toString()}`;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    priority?: string;
    projectId?: string;
    assignee?: string;
    view?: string;
    focus?: string;
    mode?: string;
    search?: string;
    page?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const params = await searchParams;
  const tab = params.tab === "templates" ? "templates" : "tasks";
  const view = params.view === "board" ? "board" : params.view === "weekly" ? "weekly" : "list";
  const search = params.search?.trim() || "";
  const requestedPage = Math.max(1, Number(params.page) || 1);
  const whereClauses = [eq(tasks.workspaceId, workspaceId)];
  if (params.mode === "workflow" || params.mode === "reusable") whereClauses.push(eq(tasks.mode, params.mode));
  if (params.status && params.status !== "all") whereClauses.push(eq(tasks.status, params.status as typeof tasks.status.enumValues[number]));
  if (params.priority && params.priority !== "all") whereClauses.push(eq(tasks.priority, params.priority as typeof tasks.priority.enumValues[number]));
  if (params.projectId) whereClauses.push(eq(tasks.projectId, params.projectId));
  if (params.assignee === "me") whereClauses.push(eq(tasks.assigneeId, user.id));
  else if (params.assignee === "unassigned") whereClauses.push(sql`${tasks.assigneeId} IS NULL`);
  else if (params.assignee && params.assignee !== "all") whereClauses.push(eq(tasks.assigneeId, params.assignee));
  if (search) {
    whereClauses.push(
      sql`(${tasks.title} ILIKE ${`%${search}%`} OR ${tasks.description} ILIKE ${`%${search}%`})`
    );
  }

  const [{ filteredTaskCount }] = await db.select({ filteredTaskCount: sql<number>`count(${tasks.id})::int` }).from(tasks).where(and(...whereClauses));
  const totalPages = Math.max(1, Math.ceil(filteredTaskCount / PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const taskList = await db.select({
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
    mode: tasks.mode,
    lifecycle: tasks.lifecycle,
  }).from(tasks).leftJoin(projects, eq(projects.id, tasks.projectId)).leftJoin(clients, eq(clients.id, projects.clientId)).leftJoin(users, eq(users.id, tasks.assigneeId)).where(and(...whereClauses)).orderBy(desc(tasks.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE);
  const projectRows = await db.select({ id: projects.id, name: projects.name, billingModel: projects.billingModel, billingType: projects.billingType }).from(projects).where(eq(projects.workspaceId, workspaceId));
  const writableProjectRows = projectRows.filter((project) => resolveBillingModel(project) !== "legacy_package");
  const taskProjects = writableProjectRows.map((project) => ({ id: project.id, name: project.name, defaultBehavior: defaultTaskWorkMode(resolveBillingModel(project)) === "workflow" ? "one_time" as const : "recurring" as const }));
  const members = await db.select({ id: users.id, name: users.name, email: users.email }).from(workspaceMembers).innerJoin(users, eq(users.id, workspaceMembers.userId)).where(eq(workspaceMembers.workspaceId, workspaceId));
  const templateRows = await db.select().from(taskTemplates).where(eq(taskTemplates.workspaceId, workspaceId)).orderBy(desc(taskTemplates.updatedAt));
  const itemRows = await db.select().from(taskTemplateItems).where(eq(taskTemplateItems.workspaceId, workspaceId));
  const templates = templateRows.map((template) => ({ ...template, items: itemRows.filter((item) => item.templateId === template.id) }));

  return <div className="min-w-0 space-y-6">
    <PageHeader
      icon={CheckSquare}
      title={t("Tugas", "Tasks")}
      description={t("Kelola pekerjaan proyek, prioritas, dan template tugas reusable.", "Manage project work, priorities, and reusable task templates.")}
      actions={
        tab === "tasks" ? (
          <div className="flex flex-wrap items-center gap-2">
            <TaskViewToggle current={view} />
            <TaskCreateDialog projectId={params.projectId} members={members} projects={taskProjects} />
          </div>
        ) : null
      }
    />
    <TaskPageTabs current={tab} />
    {tab === "templates" ? (
      <TaskTemplateWorkspace templates={templates} projects={taskProjects} />
    ) : (
      <>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <ActiveFilterSummary
              basePath="/app/tasks"
              filters={[
                { key: "search", label: t("Pencarian", "Search"), value: search },
                { key: "projectId", label: t("Proyek", "Project"), value: taskProjects.find((project) => project.id === params.projectId)?.name },
                { key: "assignee", label: t("Petugas", "Assignee"), value: params.assignee },
                { key: "priority", label: t("Prioritas", "Priority"), value: params.priority },
                { key: "status", label: "Status", value: params.status },
              ]}
            />
          </div>

          <form className="relative w-full sm:w-64 shrink-0 sm:ml-auto">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              aria-label={t("Cari tugas", "Search tasks")}
              defaultValue={search}
              placeholder={t("Cari tugas...", "Search tasks...")}
              className="pl-8"
            />
            {params.status && <input type="hidden" name="status" value={params.status} />}
            {params.priority && <input type="hidden" name="priority" value={params.priority} />}
            {params.projectId && <input type="hidden" name="projectId" value={params.projectId} />}
            {params.assignee && <input type="hidden" name="assignee" value={params.assignee} />}
            {params.view && <input type="hidden" name="view" value={params.view} />}
          </form>
        </div>
      {view === "weekly" ? (
        <TasksWeeklyTracker tasks={taskList} />
      ) : view === "board" ? (
        <TasksBoardView tasks={taskList.map((task) => ({ ...task, projectId: task.projectId ?? undefined }))} members={members} />
      ) : (
        <TasksListTable tasks={taskList} members={members} projects={taskProjects} currentUserId={user.id} currentFilters={{ status: params.status, priority: params.priority, projectId: params.projectId, assignee: params.assignee }} focusId={params.focus ?? null} />
      )}
      {totalPages > 1 && <nav className="flex flex-wrap items-center justify-between gap-3" aria-label={t("Paginasi tugas", "Task pagination")}><span className="text-sm text-muted-foreground">{t("Halaman", "Page")} {page} {t("dari", "of")} {totalPages}</span><div className="flex gap-2"><Link className={`rounded border px-3 py-2 text-sm ${page===1?"pointer-events-none opacity-50":""}`} href={buildTaskPageHref(params,page-1)}>{t("Sebelumnya", "Previous")}</Link><Link className={`rounded border px-3 py-2 text-sm ${page===totalPages?"pointer-events-none opacity-50":""}`} href={buildTaskPageHref(params,page+1)}>{t("Berikutnya", "Next")}</Link></div></nav>}
      </>
    )}
  </div>;
}
