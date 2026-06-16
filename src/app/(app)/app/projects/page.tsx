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

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Track your project pipeline
          </p>
        </div>
        {canWrite && (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>New Project</DialogTitle>
              </DialogHeader>
              <ProjectForm mode="create" />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="rounded-lg border bg-card">
        <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
          <div className="col-span-3">Project</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1">Due</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {projectsList.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No projects yet
          </div>
        )}

        {projectsList.map((project) => (
          <div
            key={project.id}
            className="grid grid-cols-12 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
          >
            <div className="col-span-3">
              <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                {project.name}
              </Link>
              {project.clientVisible && (
                <Badge variant="outline" className="ml-2 text-[10px]">Client visible</Badge>
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
                    <Link href={`/app/projects/${project.id}`}>View Details</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/app/tasks?projectId=${project.id}`}>View Tasks</Link>
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
