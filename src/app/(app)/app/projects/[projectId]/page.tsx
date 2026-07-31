import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, files, timeEntries, workspaceMembers, users, projectServices, invoices } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
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
import { billingTypeHint, billingTypeLabel } from "@/lib/feature-access";
import { ProjectTaskWorkspace } from "@/components/tasks/project-task-workspace";
import { ProjectBillingTab } from "@/components/projects/project-billing-tab";
import { resolveBillingModel } from "@/lib/billing-model";
import { resolveProjectTaskMode } from "@/lib/task-work-mode";
import { ProjectForm } from "@/components/forms/project-form";
import { Timesheet } from "@/components/time/timesheet";
import Link from "next/link";
import {
  ArrowLeft,
  Pencil,
  Clock,
  FileText,
  CheckSquare,
  Wallet,
} from "lucide-react";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const { projectId } = await params;
  const { from } = await searchParams;

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
      billingModel: projects.billingModel,
      timeTrackingMode: projects.timeTrackingMode,
      activityRequired: projects.activityRequired,
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
      taskModePolicy: projects.taskModePolicy,
      retainerFee: projects.retainerFee,
      retainerIncludedMinutes: projects.retainerIncludedMinutes,
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
      projectId: tasks.projectId,
      projectName: projects.name,
      timeTrackingMode: projects.timeTrackingMode,
      clientName: clients.name,
      mode: tasks.mode,
      lifecycle: tasks.lifecycle,
      behavior: tasks.behavior,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .leftJoin(projects, eq(projects.id, tasks.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .where(and(eq(tasks.projectId, projectId), eq(tasks.workspaceId, workspaceId)))
    .orderBy(tasks.position);



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
      endTime: timeEntries.endTime,
      manualMinutes: timeEntries.manualMinutes,
      billable: timeEntries.billable,
      hourlyRate: timeEntries.hourlyRate,
      status: timeEntries.status,
      clientId: timeEntries.clientId,
      projectId: timeEntries.projectId,
      taskId: timeEntries.taskId,
      tags: timeEntries.tags,
      clientName: clients.name,
      projectName: projects.name,
      projectCurrency: projects.currency,
      projectTimeTrackingMode: projects.timeTrackingMode,
      taskTitle: tasks.title,
      createdAt: timeEntries.createdAt,
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .leftJoin(clients, eq(clients.id, timeEntries.clientId))
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .where(eq(timeEntries.projectId, projectId))
    .orderBy(desc(timeEntries.createdAt))
    .limit(200);

  const projectInvoices = await db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, issueDate: invoices.issueDate, dueDate: invoices.dueDate, currency: invoices.currency, total: invoices.total, status: invoices.status }).from(invoices).where(and(eq(invoices.workspaceId, workspaceId), eq(invoices.projectId, projectId))).orderBy(desc(invoices.issueDate));

  const projectServiceRows = await db
    .select({ serviceId: projectServices.serviceId, projectPackageAssignmentId: projectServices.projectPackageAssignmentId })
    .from(projectServices)
    .where(and(
      eq(projectServices.projectId, projectId),
      eq(projectServices.workspaceId, workspaceId),
      eq(projectServices.status, "active"),
    ));
  const activeProjectServiceIds = projectServiceRows
    .map((row) => row.serviceId)
    .filter((id): id is string => Boolean(id));
  const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    draft: "bg-slate-400",
    on_hold: "bg-amber-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-400",
    archived: "bg-slate-500",
  };

  const backFromClient = from === "client" && !!project.clientId;
  const backHref = backFromClient
    ? `/app/clients/${project.clientId}?tab=projects`
    : "/app/projects";
  const backLabel = backFromClient
    ? t(
        `Kembali ke ${project.clientName || "Klien"}`,
        `Back to ${project.clientName || "Client"}`,
      )
    : t("Kembali ke Proyek", "Back to Projects");
  const showTimeTab = project.timeTrackingMode !== "off" || projectTimeEntries.length > 0;
  const billingModel = resolveBillingModel(project);
  const billingDisplayType = project.billingModel ?? project.billingType;
  const taskMode = resolveProjectTaskMode(project.taskModePolicy, billingModel);
  const projectOptions = project.clientId
    ? [
        {
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          timeTrackingMode: project.timeTrackingMode,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <Link
            href={backHref}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> {backLabel}
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <h1 className="min-w-0 truncate app-page-title">{project.name}</h1>
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
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="outline" className="gap-1 font-normal">
              {billingTypeLabel(billingDisplayType, lang)}
            </Badge>
            {project.billingType === "hours" && project.rate && (
              <span className="text-xs text-muted-foreground">
                {t("Rate", "Rate")}: {project.currency} {Number(project.rate).toLocaleString(locale)}
                /{t("jam", "hr")}
              </span>
            )}
            {billingDisplayType === "fixed_price" && project.budget && (
              <span className="text-xs text-muted-foreground">
                {t("Fixed rate", "Fixed rate")}: {project.currency}{" "}
                {Number(project.budget).toLocaleString(locale)}
              </span>
            )}
            {billingDisplayType === "package" && (
              <span className="text-xs text-muted-foreground">
                {t("Billing paket", "Package billing")}
                {project.selectedPackageId ? "" : ` · ${t("paket belum dipilih", "no package selected")}`}
              </span>
            )}
          </div>
          <p className="max-w-xl text-xs text-muted-foreground">
            {billingTypeHint(billingDisplayType, lang)}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <Pencil className="h-3 w-3" /> {t("Ubah", "Edit")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] w-[calc(100%-1rem)] overflow-y-auto p-4 sm:max-w-[500px] sm:p-6">
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
                timeTrackingMode: project.timeTrackingMode,
                activityRequired: project.activityRequired,
                currency: project.currency,
                rate: project.rate ?? "",
                budget: project.budget ?? "",
                startDate: project.startDate ?? "",
                finishDate: project.finishDate ?? "",
                dueDate: project.dueDate ?? "",
                clientVisible: project.clientVisible,
                selectedPackageId: project.selectedPackageId,
                serviceIds: activeProjectServiceIds,
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
      <Tabs defaultValue="work">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="work" className="gap-1">
            <CheckSquare className="h-3 w-3" /> {t("Pekerjaan", "Work")} ({projectTasks.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FileText className="h-3 w-3" /> {t("Berkas", "Files")} ({projectFiles.length})
          </TabsTrigger>
          {showTimeTab ? (
            <TabsTrigger value="time" className="gap-1">
              <Clock className="h-3 w-3" /> {t("Waktu", "Time")} ({projectTimeEntries.length})
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="billing" className="gap-1">
            <Wallet className="h-3 w-3" /> Billing ({projectInvoices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="work" className="pt-4">
          <ProjectTaskWorkspace projectId={projectId} mode={taskMode} workflowTasks={projectTasks.filter((task) => task.mode === "workflow")} reusableTasks={projectTasks.filter((task) => task.mode === "reusable").map((task) => ({ id: task.id, title: task.title, projectName: task.projectName, clientName: task.clientName, assigneeName: task.assigneeName, lifecycle: task.lifecycle }))} members={projectMembers} projects={[{ id: project.id, name: project.name }]} currentUserId={user.id} />
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

        <TabsContent value="billing" className="pt-4"><ProjectBillingTab projectId={projectId} summary={{ model: billingModel, label: billingTypeLabel(billingDisplayType, lang), currency: project.currency, budget: project.budget, hourlyRate: project.rate, retainerFee: project.retainerFee, retainerIncludedMinutes: project.retainerIncludedMinutes }} invoices={projectInvoices} /></TabsContent>

        {showTimeTab ? <TabsContent value="time" className="pt-4">
          <Timesheet
            compact
            entries={projectTimeEntries.map((entry) => ({
              id: entry.id,
              description: entry.description,
              tags: entry.tags,
              durationMinutes: entry.durationMinutes,
              manualMinutes: entry.manualMinutes,
              billable: entry.billable ?? false,
              hourlyRate: entry.hourlyRate,
              startTime: entry.startTime,
              endTime: entry.endTime,
              status: entry.status,
              clientId: entry.clientId,
              projectId: entry.projectId,
              activityId: null,
              taskId: entry.taskId,
              clientName: entry.clientName,
              projectName: entry.projectName,
              activityName: null,
              projectCurrency: entry.projectCurrency,
              projectTimeTrackingMode: entry.projectTimeTrackingMode,
              taskTitle: entry.taskTitle,
              userName: entry.userName,
              createdAt: entry.createdAt,
            }))}
            clients={project.clientId && project.clientName ? [{ id: project.clientId, name: project.clientName }] : []}
            projects={projectOptions}
            tasks={projectTasks.map((task) => ({ id: task.id, title: task.title, projectId }))}
          />
        </TabsContent> : null}

      </Tabs>
    </div>
  );
}
