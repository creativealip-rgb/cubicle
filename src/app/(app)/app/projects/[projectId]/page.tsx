import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, comments, files, timeEntries, activityLogs, workspaceMembers, users } from "@/db/schema";
import { eq, and, desc, inArray, or } from "drizzle-orm";
import { requireUser, assertProjectInWorkspace } from "@/lib/access";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getProjectProgress } from "@/lib/actions/projects";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";
import { projectStatusVariant } from "@/lib/status-badge";
import { ProjectTasksTab } from "@/components/tasks/project-tasks-tab";
import { CommentList } from "@/components/comments/comment-list";
import { ProjectForm } from "@/components/forms/project-form";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Clock,
  FileText,
  MessageSquare,
  CheckSquare,
  Activity,
} from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const { projectId } = await params;

  try {
    await assertProjectInWorkspace(db, user.id, workspaceId, projectId);
  } catch {
    notFound();
  }

  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      billingType: projects.billingType,
      currency: projects.currency,
      rate: projects.rate,
      budget: projects.budget,
      startDate: projects.startDate,
      finishDate: projects.finishDate,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      clientId: projects.clientId,
      clientName: clients.name,
      clientPhone: clients.phone,
      createdAt: projects.createdAt,
      selectedPackageId: projects.selectedPackageId,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(eq(projects.id, projectId));

  if (!project) notFound();

  const progress = await getProjectProgress(projectId);

  // Workspace members for assignee selector on task create
  const projectMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.role);

  // Tasks for kanban
  const projectTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      dueDate: tasks.dueDate,
      position: tasks.position,
      clientVisible: tasks.clientVisible,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.position);

  // Comments
  const projectComments = await db
    .select()
    .from(comments)
    .where(and(eq(comments.entityType, "project" as const), eq(comments.entityId, projectId)))
    .orderBy(desc(comments.createdAt))
    .limit(20);

  // Files
  const projectFiles = await db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.createdAt))
    .limit(20);

  // Time entries
  const projectTimeEntries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      durationMinutes: timeEntries.durationMinutes,
      userId: timeEntries.userId,
      userName: users.name,
      startTime: timeEntries.startTime,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(eq(timeEntries.projectId, projectId))
    .orderBy(desc(timeEntries.createdAt))
    .limit(20);

  const timelineEntityIds = [
    projectId,
    ...projectTasks.map((task) => task.id),
    ...projectFiles.map((file) => file.id),
    ...projectComments.map((comment) => comment.id),
    ...projectTimeEntries.map((entry) => entry.id),
  ];

  const projectTimeline = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      entityId: activityLogs.entityId,
      metadata: activityLogs.metadata,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.actorId))
    .where(
      and(
        eq(activityLogs.workspaceId, workspaceId),
        or(
          inArray(activityLogs.entityId, timelineEntityIds),
        ),
      ),
    )
    .orderBy(desc(activityLogs.createdAt))
    .limit(50);

  const actionLabels: Record<string, string> = {
    created_project: t("Membuat proyek", "Created project"),
    updated_project: t("Memperbarui proyek", "Updated project"),
    archived_project: t("Mengarsipkan proyek", "Archived project"),
    updated_project_visibility: t("Memperbarui visibilitas proyek", "Updated project visibility"),
    added_project_member: t("Menambah anggota proyek", "Added project member"),
    removed_project_member: t("Menghapus anggota proyek", "Removed project member"),
    created_task: t("Membuat tugas", "Created task"),
    updated_task: t("Memperbarui tugas", "Updated task"),
    updated_task_status: t("Memindahkan tugas", "Moved task"),
    reordered_task: t("Mengurutkan ulang tugas", "Reordered task"),
    deleted_task: t("Menghapus tugas", "Deleted task"),
    uploaded_file: t("Mengunggah berkas", "Uploaded file"),
    deleted_file: t("Menghapus berkas", "Deleted file"),
    created_comment: t("Menambah komentar", "Added comment"),
    started_timer: t("Memulai timer", "Started timer"),
    stopped_timer: t("Menghentikan timer", "Stopped timer"),
    created_time_entry: t("Mencatat waktu", "Logged time"),
    updated_time_entry: t("Memperbarui catatan waktu", "Updated time entry"),
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    draft: "bg-slate-400",
    on_hold: "bg-amber-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-400",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/app/projects" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> {t("Kembali ke Proyek", "Back to Projects")}
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={projectStatusVariant(project.status, lang).variant}>{projectStatusVariant(project.status, lang).label}</Badge>
          </div>
          {project.clientName && (
            <p className="text-sm text-muted-foreground">
              {t("Klien", "Client")}:{" "}
              <Link href={`/app/clients/${project.clientId}`} className="hover:underline">
                {project.clientName}
              </Link>
            </p>
          )}
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Pencil className="h-3 w-3" /> {t("Ubah", "Edit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t("Ubah Proyek", "Edit Project")}</DialogTitle>
            </DialogHeader>
            {/* Edit form not imported for brevity — but ProjectForm would work */}
            <ProjectForm
              mode="edit"
              clients={[]}
              defaultValues={{
                id: project.id,
                name: project.name,
                description: project.description ?? "",
                clientId: project.clientId,
                status: project.status,
                billingType: project.billingType,
                currency: project.currency,
                rate: project.rate ?? "",
                budget: project.budget ?? "",
                startDate: project.startDate ?? "",
                finishDate: project.finishDate ?? "",
                dueDate: project.dueDate ?? "",
                clientVisible: project.clientVisible,
                selectedPackageId: project.selectedPackageId,
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress bar */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium">{t("Progres", "Progress")}</span>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {progress.done}/{progress.total} {t("tugas", "tasks")} · {progress.percent}%
              </span>
              {project.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("Jatuh tempo", "Due")}: {new Date(project.dueDate).toLocaleDateString(locale)}
                </span>
              )}
            </div>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${statusColors[project.status] ?? "bg-slate-400"}`}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="tasks">
        <TabsList>
          <TabsTrigger value="tasks" className="gap-1">
            <CheckSquare className="h-3 w-3" /> {t("Tugas", "Tasks")} ({projectTasks.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FileText className="h-3 w-3" /> {t("Berkas", "Files")} ({projectFiles.length})
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-1">
            <Clock className="h-3 w-3" /> {t("Waktu", "Time")} ({projectTimeEntries.length})
          </TabsTrigger>
          <TabsTrigger value="comments" className="gap-1">
            <MessageSquare className="h-3 w-3" /> {t("Komentar", "Comments")} ({projectComments.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1">
            <Activity className="h-3 w-3" /> {t("Linimasa", "Timeline")} ({projectTimeline.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="pt-4">
          <ProjectTasksTab projectId={projectId} tasks={projectTasks} members={projectMembers} />
        </TabsContent>

        <TabsContent value="files" className="pt-4 space-y-3">
          {projectFiles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada berkas</p>
          )}
          {projectFiles.map((file: { id: string; name: string; mimeType: string | null; visibility: string }) => (
            <Card key={file.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{file.mimeType}</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px]">{file.visibility}</Badge>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="time" className="pt-4 space-y-3">
          {projectTimeEntries.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada catatan waktu</p>
          )}
          {projectTimeEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{entry.description || t("Tanpa judul", "Untitled")}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.userName || t("Tidak diketahui", "Unknown")} · {entry.durationMinutes} {t("mnt", "min")}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </span>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="comments" className="pt-4">
          <CommentList
            entityType="project"
            entityId={projectId}
            initialComments={projectComments.map((c) => ({
              id: c.id,
              body: c.body,
              visibility: c.visibility,
              authorName: c.authorName,
              authorEmail: c.authorEmail,
              source: c.source,
              createdAt: c.createdAt,
            }))}
            clientPhone={project.clientPhone}
            contextTitle={project.name}
          />
        </TabsContent>

        <TabsContent value="timeline" className="pt-4">
          <Card>
            <CardContent className="p-0">
              {projectTimeline.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">Belum ada aktivitas</p>
              )}
              <div className="divide-y">
                {projectTimeline.map((event) => (
                  <div key={event.id} className="flex gap-3 p-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-medium">
                          {actionLabels[event.action] ?? event.action.replace(/_/g, " ")}
                        </p>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {event.entityType.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {event.actorName || event.actorEmail || t("Sistem", "System")} · {new Date(event.createdAt).toLocaleString(locale)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
