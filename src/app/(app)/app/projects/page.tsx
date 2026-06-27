import { getWorkspaceForCurrentUser, getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, workspaces, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ProjectForm } from "@/components/forms/project-form";
import { EmptyState } from "@/components/empty-state";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";
  const _params = await searchParams;

  const whereClauses = [eq(projects.workspaceId, workspaceId)];

  const projectsList = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      clientId: projects.clientId,
      clientName: clients.name,
      totalTasks: sql<number>`count(${tasks.id})::int`,
      doneTasks: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(and(...whereClauses))
    .groupBy(projects.id, clients.name)
    .orderBy(desc(projects.createdAt));

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    draft: "bg-slate-400",
    on_hold: "bg-amber-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-400",
  };

  return (
    <div className="space-y-6 min-w-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project</h1>
          <p className="text-sm text-muted-foreground">
            Pantau pipeline project-mu
          </p>
        </div>
        {canWrite && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Project Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Project Baru</DialogTitle>
              </DialogHeader>
              <ProjectForm mode="create" />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
          <div className="col-span-3">Project</div>
          <div className="col-span-2">Klien</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1">Jatuh Tempo</div>
          <div className="col-span-2 text-right">Aksi</div>
        </div>

        {projectsList.length === 0 && (
          <EmptyState
            icon={Plus}
            title="Belum ada project"
            description="Buat project pertama untuk mulai pantau pekerjaan."
          />
        )}

        <div className="md:hidden divide-y">
          {projectsList.map((project) => (
            <div key={project.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <div className="text-sm text-muted-foreground truncate">
                    {project.clientName || "—"}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {project.status.replace("_", " ")}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{project.doneTasks}/{project.totalTasks}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
                    style={{
                      width: `${project.totalTasks > 0 ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {project.dueDate ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
                {project.clientVisible && (
                  <Badge variant="outline" className="text-[10px]">Terlihat klien</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {projectsList.map((project) => (
          <div
            key={project.id}
            className="hidden md:grid grid-cols-12 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
          >
            <div className="col-span-3">
              <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                {project.name}
              </Link>
              {project.clientVisible && (
                <Badge variant="outline" className="ml-2 text-[10px]">Terlihat klien</Badge>
              )}
            </div>
            <div className="col-span-2 text-sm text-muted-foreground truncate">
              {project.clientName || "—"}
            </div>
            <div className="col-span-2">
              <Badge variant="outline" className="text-xs capitalize">
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
                    style={{
                      width: `${project.totalTasks > 0 ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {project.doneTasks}/{project.totalTasks}
                </span>
              </div>
            </div>
            <div className="col-span-1 text-xs text-muted-foreground">
              {project.dueDate ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(project.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              ) : (
                "—"
              )}
            </div>
            <div className="col-span-2 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/app/projects/${project.id}`}>Lihat Detail</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/app/tasks?projectId=${project.id}`}>Lihat Task</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
