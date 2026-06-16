import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { tasks, projects, users, workspaces } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskForm } from "@/components/forms/task-form";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import {
  Plus,
  Filter,
  Clock,
  AlertTriangle,
} from "lucide-react";

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; projectId?: string; assignee?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
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

  // Get workspace members for filter
  const _memberList = await db
    .select({ id: users.id, name: users.name })
    .from(users);

  const priorityColors: Record<string, string> = {
    low: "border-slate-300 text-slate-600",
    medium: "border-blue-300 text-blue-600",
    high: "border-amber-300 text-amber-600",
    urgent: "border-red-300 text-red-600",
  };

  const statusBadges: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    todo: { label: "Todo", variant: "secondary" },
    in_progress: { label: "In Progress", variant: "default" },
    review: { label: "Review", variant: "outline" },
    done: { label: "Done", variant: "default" },
  };
  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track work across your projects
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <Plus className="h-4 w-4" /> New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <TaskForm mode="create" projectId={params.projectId} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap items-center gap-2">
          <Select name="status" defaultValue={params.status ?? "all"}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          <Select name="priority" defaultValue={params.priority ?? "all"}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select name="projectId" defaultValue={params.projectId ?? "all"}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projectList.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="submit" variant="outline" size="sm" className="h-8 gap-1">
            <Filter className="h-3 w-3" /> Filter
          </Button>
        </form>
      </div>

      {/* Task List */}
      <div className="space-y-2">
        {taskList.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No tasks found
          </div>
        )}
        {taskList.map((task) => {
          const sb = statusBadges[task.status] ?? statusBadges.todo;
          return (
            <TaskDetailSheet key={task.id} task={task}>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.projectName && (
                          <span className="text-xs text-muted-foreground">{task.projectName}</span>
                        )}
                        {task.dueDate && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className={`text-[10px] ${priorityColors[task.priority]}`}>
                      {task.priority === "urgent" && <AlertTriangle className="h-3 w-3 mr-0.5" />}
                      {task.priority}
                    </Badge>
                    {task.assigneeName && (
                      <span className="text-xs text-muted-foreground">{task.assigneeName}</span>
                    )}
                    <Badge variant={sb.variant as "default" | "secondary" | "outline" | "destructive"} className="text-[10px]">
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
