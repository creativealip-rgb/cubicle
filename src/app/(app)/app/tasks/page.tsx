import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, projects, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { EmptyState } from "@/components/empty-state";
import {
  Filter,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { taskPriorityColor, taskStatusVariant } from "@/lib/status-badge";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; projectId?: string; assignee?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const currentUserId = _user.id;
  const workspaceId = await getWorkspaceId();
  const params = await searchParams;

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
          <h1 className="text-2xl font-bold tracking-tight">Task</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pantau pekerjaan di semua project
          </p>
        </div>
        <TaskCreateDialog projectId={params.projectId} members={memberList} projects={projectList} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap items-center gap-2">
          <Select name="status" defaultValue={params.status ?? "all"}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">Sedang Dikerjakan</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Selesai</SelectItem>
            </SelectContent>
          </Select>

          <Select name="priority" defaultValue={params.priority ?? "all"}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Prioritas</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="low">Rendah</SelectItem>
            </SelectContent>
          </Select>

          <Select name="projectId" defaultValue={params.projectId ?? "all"}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Project</SelectItem>
              {projectList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select name="assignee" defaultValue={params.assignee ?? "all"}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              <SelectItem value="me">Ditugaskan ke saya</SelectItem>
              <SelectItem value="unassigned">Belum ditugaskan</SelectItem>
              {memberList.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.email || m.id.slice(0, 8)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3 w-3" /> Filter
          </Button>
        </form>
      </div>

      {/* Task List */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {taskList.length > 0 && (
          <div className="hidden items-center gap-4 border-b bg-muted/40 px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:flex">
            <div className="min-w-0 flex-1">Judul</div>
            <div className="w-32">Project</div>
            <div className="w-28">Assignee</div>
            <div className="w-24">Jatuh Tempo</div>
            <div className="w-20">Prioritas</div>
            <div className="w-24">Status</div>
          </div>
        )}
        {taskList.length === 0 && (
          <EmptyState
            icon={Filter}
            title="Tidak ada task ditemukan"
            description="Tidak ada task yang cocok dengan filter. Coba ubah filter atau buat task baru."
          />
        )}
        {taskList.map((task) => {
          const sb = taskStatusVariant(task.status);
          return (
            <TaskDetailSheet key={task.id} task={task} members={memberList}>
              <Card className="cursor-pointer rounded-none border-0 border-b shadow-none transition-colors last:border-b-0 hover:bg-muted/50">
                <CardContent className="grid gap-3 p-4 md:flex md:items-center md:gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                  </div>
                  <div className="text-xs text-muted-foreground md:w-32 md:truncate">
                    {task.projectName ?? "Tanpa project"}
                  </div>
                  <div className="text-xs text-muted-foreground md:w-28 md:truncate">
                    {task.assigneeName ?? "Belum ditugaskan"}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground md:w-24">
                    {task.dueDate ? (
                      <>
                        <Clock className="h-3 w-3" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </>
                    ) : (
                      "Tanpa tenggat"
                    )}
                  </div>
                  <div className="md:w-20">
                    <Badge variant="outline" className={`text-[10px] ${taskPriorityColor(task.priority)}`}>
                      {task.priority === "urgent" && <AlertTriangle className="mr-0.5 h-3 w-3" />}
                      {task.priority}
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
    </div>
  );
}
