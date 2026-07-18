import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, projects, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskViewToggle } from "@/components/tasks/task-view-toggle";
import { TasksBoardView } from "@/components/tasks/tasks-board-view";
import { EmptyState } from "@/components/empty-state";
import {
  Filter,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { taskPriorityColor, taskStatusVariant, taskPriorityLabel } from "@/lib/status-badge";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";

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
  const locale = getLocale(lang);
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
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      sourceNoteId: tasks.sourceNoteId,
    })
    .from(tasks)
    .leftJoin(projects, eq(projects.id, tasks.projectId))
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
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("Tugas", "Tasks")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("Pantau pekerjaan di semua proyek", "Track work across all projects")}
          </p>
        </div>
        <TaskCreateDialog projectId={params.projectId} members={memberList} projects={projectList} />
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-950">
        <p className="font-medium">
          {t("Tugas ≠ timer", "Tasks ≠ timer")}
        </p>
        <p className="mt-1 text-xs text-blue-900/80">
          {t(
            "Tugas = to-do / status kerja (todo → done). Waktu / timer = jam billable yang bisa di-import ke invoice. Link task ke timer opsional biar rapi.",
            "Tasks = to-do / work status (todo → done). Time / timer = billable hours you can import to invoices. Linking a task to the timer is optional.",
          )}{" "}
          <a href="/app/time" className="font-medium underline underline-offset-2">
            {t("Buka Time Tracking", "Open Time Tracking")}
          </a>
        </p>
      </div>

      {/* Filters + view toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TaskFilters
          projects={projectList}
          members={memberList}
          current={{
            status: params.status,
            priority: params.priority,
            projectId: params.projectId,
            assignee: params.assignee,
          }}
        />
        <TaskViewToggle current={view} />
      </div>

      {/* Board view */}
      {view === "board" && <TasksBoardView tasks={taskList} members={memberList} />}

      {/* Task List */}
      {view === "list" && (
      <div className="overflow-hidden rounded-lg border bg-card">
        {taskList.length > 0 && (
          <div className="hidden items-center gap-4 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:flex">
            <div className="min-w-0 flex-1">{t("Judul", "Title")}</div>
            <div className="w-32">{t("Proyek", "Project")}</div>
            <div className="w-28">{t("Ditugaskan", "Assignee")}</div>
            <div className="w-24">{t("Jatuh Tempo", "Due")}</div>
            <div className="w-20">{t("Prioritas", "Priority")}</div>
            <div className="w-24">{t("Status", "Status")}</div>
          </div>
        )}
        {taskList.length === 0 && (
          <EmptyState
            icon={Filter}
            title={t("Tidak ada tugas ditemukan", "No tasks found")}
            description={t("Tidak ada tugas yang cocok dengan filter. Coba ubah filter atau buat tugas baru.", "No tasks match the filter. Try changing the filter or create a new task.")}
          />
        )}
        {taskList.map((task) => {
          const sb = taskStatusVariant(task.status, lang);
          const isFocus = focusId === task.id;
          return (
            <TaskDetailSheet
              key={task.id}
              task={task}
              members={memberList}
              defaultOpen={isFocus}
            >
              <Card
                id={isFocus ? `task-${task.id}` : undefined}
                className={`cursor-pointer rounded-none border-0 border-b shadow-none transition-colors last:border-b-0 hover:bg-muted/50 ${isFocus ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""}`}
              >
                <CardContent className="grid gap-3 p-4 md:flex md:items-center md:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.sourceNoteId ? (
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {t("Dari catatan", "From note")}
                      </p>
                    ) : null}
                  </div>
                  <div className="text-xs text-muted-foreground md:w-32 md:truncate">
                    {task.projectName ?? t("Tanpa proyek", "No project")}
                  </div>
                  <div className="text-xs text-muted-foreground md:w-28 md:truncate">
                    {task.assigneeName ?? t("Belum ditugaskan", "Unassigned")}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground md:w-24">
                    {task.dueDate ? (
                      <>
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString(locale)}
                      </>
                    ) : (
                      t("Tanpa tenggat", "No due date")
                    )}
                  </div>
                  <div className="md:w-20">
                    <Badge variant="outline" className={`text-[10px] ${taskPriorityColor(task.priority)}`}>
                      {task.priority === "urgent" && <AlertTriangle className="mr-0.5 h-3 w-3" />}
                      {taskPriorityLabel(task.priority, lang)}
                    </Badge>
                  </div>
                  <div className="md:w-24">
                    <Badge variant={sb.variant} className="text-[10px]">
                      {sb.label}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </TaskDetailSheet>
          );
        })}
      </div>
      )}
    </div>
  );
}
