import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, files, timeEntries, workspaceMembers, users, projectServices, invoices, workspaces, workspaceCurrencyRates, packages, retainerPeriods } from "@/db/schema";
import { and, eq, desc, inArray } from "drizzle-orm";
import { requireUser, assertProjectInWorkspace } from "@/lib/access";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getProjectProgress } from "@/lib/actions/projects";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";
import { projectStatusVariant } from "@/lib/status-badge";
import { billingTypeLabel } from "@/lib/feature-access";
import { ProjectTaskWorkspace } from "@/components/tasks/project-task-workspace";
import { WorkflowTaskWorkspace } from "@/components/tasks/workflow-task-workspace";
import { ProjectBillingTab } from "@/components/projects/project-billing-tab";
import { resolveBillingModel } from "@/lib/billing-model";
import { resolveProjectTaskMode } from "@/lib/task-work-mode";
import { loadInvoiceSourceProjectOptions } from "@/lib/invoice-source-options";
import { resolveProjectAmount } from "@/lib/invoice-project-items";
import { getProposedInvoiceNumber } from "@/lib/actions/invoices";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";
import { ProjectTabsNav } from "@/components/projects/project-tabs-nav";
import { ProjectEditDialog } from "@/components/projects/project-edit-dialog";
import { Timesheet } from "@/components/time/timesheet";
import Link from "next/link";
import {
  Clock,
  FileText,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { TaskCreateDialog } from "@/components/tasks/task-create-dialog";
import { UploadButton } from "@/components/files/upload-button";
import { ProjectInvoiceCreateDialog } from "@/components/invoices/project-invoice-create-dialog";
import { RetainerProjectInvoiceActions } from "@/components/invoices/retainer-project-invoice-actions";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ from?: string; tab?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const proposedInvoiceNumber = await getProposedInvoiceNumber();
  const { projectId } = await params;
  const { from: _from, tab: tabParam } = await searchParams;
  const allowedTabs = new Set(["work", "files", "time", "billing"]);
  const initialTab = tabParam && allowedTabs.has(tabParam) ? tabParam : "work";

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
      retainerResetDay: projects.retainerResetDay,
      retainerOveragePolicy: projects.retainerOveragePolicy,
      retainerOverageRate: projects.retainerOverageRate,
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

  const sourceOptions = await loadInvoiceSourceProjectOptions({ workspaceId, clientId: project.clientId ?? undefined, projectIds: [projectId] });
  const projectInvoices = await db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, issueDate: invoices.issueDate, dueDate: invoices.dueDate, currency: invoices.currency, total: invoices.total, status: invoices.status }).from(invoices).where(and(eq(invoices.workspaceId, workspaceId), eq(invoices.projectId, projectId))).orderBy(desc(invoices.issueDate));
  const [workspace] = await db.select({ defaultCurrency: workspaces.defaultCurrency }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currencyRates = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const [selectedPackage] = project.selectedPackageId ? await db.select({ price: packages.price, customPrice: packages.customPrice }).from(packages).where(eq(packages.id, project.selectedPackageId)).limit(1) : [];
  const [retainerPeriod] = project.billingModel === "retainer" ? await db.select({
    id: retainerPeriods.id, periodStart: retainerPeriods.periodStart, periodEnd: retainerPeriods.periodEnd,
    feeSnapshot: retainerPeriods.feeSnapshot, currencySnapshot: retainerPeriods.currencySnapshot,
    includedMinutesSnapshot: retainerPeriods.includedMinutesSnapshot, approvedMinutes: retainerPeriods.approvedMinutes,
    overageMinutes: retainerPeriods.overageMinutes, overagePolicySnapshot: retainerPeriods.overagePolicySnapshot,
    overageRateSnapshot: retainerPeriods.overageRateSnapshot, status: retainerPeriods.status,
  }).from(retainerPeriods).where(and(eq(retainerPeriods.workspaceId, workspaceId), eq(retainerPeriods.projectId, projectId), inArray(retainerPeriods.status, ["open", "locked"]))).orderBy(desc(retainerPeriods.periodStart)).limit(1) : [];

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

  const showTimeTab = project.timeTrackingMode !== "off" || projectTimeEntries.length > 0;
  const billingModel = resolveBillingModel(project);
  const legacyPackageReadOnly = billingModel === "legacy_package";
  const billingDisplayType = project.billingModel ?? project.billingType;
  const taskMode = legacyPackageReadOnly
    ? "workflow"
    : resolveProjectTaskMode(project.taskModePolicy, billingModel);
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
      {/* Unified Executive PageHeader with Client/Project Breadcrumb */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/5 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <FolderKanban className="h-4.5 w-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                {/* Integrated Hierarchical Breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Link
                    href="/app/projects"
                    className="hover:text-foreground transition-colors"
                  >
                    {t("Proyek", "Projects")}
                  </Link>
                  {project.clientName && project.clientId ? (
                    <>
                      <span className="text-muted-foreground/40">/</span>
                      <Link
                        href={`/app/clients/${project.clientId}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {project.clientName}
                      </Link>
                    </>
                  ) : null}
                  <span className="text-muted-foreground/40">/</span>
                  <span className="truncate font-semibold text-foreground">
                    {project.name}
                  </span>
                </div>

                {/* Title & Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">
                    {project.name}
                  </h1>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold h-5 px-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  >
                    <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {projectStatusVariant(project.status, lang).label}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-semibold h-5 px-2 rounded-full border border-border/80 bg-muted/60 text-muted-foreground"
                  >
                    {billingTypeLabel(billingDisplayType, lang)}
                  </Badge>
                  {billingDisplayType === "fixed_price" && project.budget && (
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {project.currency} {Number(project.budget).toLocaleString(locale)}
                    </span>
                  )}
                  {project.billingType === "hours" && project.rate && (
                    <span className="text-xs font-mono font-semibold text-foreground">
                      {project.currency} {Number(project.rate).toLocaleString(locale)}/{t("jam", "hr")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Group */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <ProjectEditDialog
                project={project}
                activeProjectServiceIds={activeProjectServiceIds}
              />
              <PermanentDeleteButton
                entityType="project"
                entityId={project.id}
                entityName={project.name}
                redirectTo={`/app/clients/${project.clientId}?tab=projects`}
              />
            </div>
          </div>

          {/* Integrated Progress Bar in Header Footer */}
          <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              <span>
                {t("Progres", "Progress")}:{" "}
                <strong className="text-foreground">
                  {billingModel === "retainer" && retainerPeriod
                    ? `${(retainerPeriod.approvedMinutes / 60).toFixed(0)}/${(retainerPeriod.includedMinutesSnapshot / 60).toFixed(0)} ${t("jam", "hr")} · ${retainerPeriod.includedMinutesSnapshot > 0 ? Math.round((retainerPeriod.approvedMinutes / retainerPeriod.includedMinutesSnapshot) * 100) : 0}%`
                    : `${progress.done}/${progress.total} ${t("tugas", "tasks")} · ${progress.percent}%`}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {project.dueDate && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {t("Jatuh tempo", "Due")}: {new Date(project.dueDate).toLocaleDateString(locale)}
                </span>
              )}
              <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${statusColors[project.status] ?? "bg-slate-400"}`}
                  style={{
                    width: `${billingModel === "retainer" && retainerPeriod && retainerPeriod.includedMinutesSnapshot > 0 ? Math.min(100, Math.round((retainerPeriod.approvedMinutes / retainerPeriod.includedMinutesSnapshot) * 100)) : progress.percent}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <ProjectTabsNav
        initialTab={initialTab}
        tasksCount={projectTasks.length}
        filesCount={projectFiles.length}
        timeCount={projectTimeEntries.length}
        invoicesCount={projectInvoices.length}
        showTimeTab={showTimeTab}
        tasksAction={
          <TaskCreateDialog
            projectId={projectId}
            members={projectMembers}
            projects={projectOptions}
          />
        }
        filesAction={
          <UploadButton
            workspaceId={workspaceId}
            projectId={projectId}
            clientId={project.clientId ?? undefined}
          />
        }
        billingAction={
          project.clientId ? (
            project.billingType === "retainer" ? (
              <RetainerProjectInvoiceActions
                projectId={project.id}
                period={retainerPeriod}
                proposedInvoiceNumber={proposedInvoiceNumber}
              />
            ) : (
              <ProjectInvoiceCreateDialog
                project={{
                  id: project.id,
                  name: project.name,
                  clientId: project.clientId,
                  billingType: project.billingModel ?? project.billingType,
                  currency: project.currency,
                  budget:
                    project.billingModel === "retainer"
                      ? project.retainerFee
                      : project.budget,
                  rate: project.rate,
                  packagePrice: selectedPackage?.price ?? null,
                  packageCustomPrice: selectedPackage?.customPrice ?? null,
                  agreedAmount: resolveProjectAmount({
                    billingType: project.billingType,
                    budget:
                      project.billingModel === "retainer" && project.retainerFee
                        ? Number(project.retainerFee)
                        : project.budget
                          ? Number(project.budget)
                          : null,
                    rate: project.rate ? Number(project.rate) : null,
                    packagePrice:
                      Number(
                        selectedPackage?.customPrice ??
                          selectedPackage?.price ??
                          0,
                      ) || null,
                  }),
                  priorActiveFixedBilledAmount:
                    sourceOptions.get(project.id)?.priorActiveFixedBilledAmount ??
                    0,
                  eligibleTimeEntries:
                    sourceOptions.get(project.id)?.eligibleTimeEntries ?? [],
                }}
                client={{
                  id: project.clientId,
                  name: project.clientName ?? "Klien",
                  companyName: null,
                }}
                baseCurrency={workspace?.defaultCurrency ?? "IDR"}
                proposedInvoiceNumber={proposedInvoiceNumber}
                currencyRates={currencyRates}
              />
            )
          ) : null
        }
        tasksContent={
          legacyPackageReadOnly ? (
            <div className="space-y-3">
              <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t(
                  "Project Paket legacy bersifat hanya baca sampai model billing diklasifikasikan.",
                  "Legacy package projects are read-only until the billing model is classified."
                )}
              </p>
              <WorkflowTaskWorkspace
                title={t("Tugas Workflow", "Workflow Tasks")}
                tasks={projectTasks.filter((task) => task.mode === "workflow")}
                members={projectMembers}
                projects={[{ id: project.id, name: project.name }]}
                currentUserId={user.id}
              />
            </div>
          ) : (
            <ProjectTaskWorkspace
              projectId={projectId}
              mode={taskMode}
              workflowTasks={projectTasks.filter((task) => task.mode === "workflow")}
              reusableTasks={projectTasks
                .filter((task) => task.mode === "reusable")
                .map((task) => ({
                  id: task.id,
                  projectId,
                  title: task.title,
                  description: task.description,
                  assigneeId: task.assigneeId,
                  projectName: task.projectName,
                  clientName: task.clientName,
                  assigneeName: task.assigneeName,
                  lifecycle: task.lifecycle,
                }))}
              members={projectMembers}
              projects={[{ id: project.id, name: project.name }]}
              currentUserId={user.id}
            />
          )
        }
        filesContent={
          <div className="space-y-3">
            {projectFiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-8 text-center">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary mb-3">
                  <FileText className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  {t("Belum ada berkas proyek", "No project files yet")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {t(
                    "Unggah dokumen, brief, atau aset deliverables untuk dibagikan ke tim dan klien.",
                    "Upload documents, briefs, or deliverable assets to share with team and client.",
                  )}
                </p>
                <div className="mt-4 flex justify-center">
                  <UploadButton
                    workspaceId={workspaceId}
                    projectId={projectId}
                    clientId={project.clientId ?? undefined}
                  />
                </div>
              </div>
            ) : (
              projectFiles.map(
                (file: { id: string; name: string; mimeType: string | null; visibility: string }) => (
                  <Card key={file.id} className="rounded-xl border border-border/80 shadow-xs hover:border-primary/30 transition-colors">
                    <CardContent className="flex items-center justify-between p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{file.name}</p>
                          <p className="text-xs text-muted-foreground">{file.mimeType || "File"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold h-5 px-2 rounded-full border border-border/80 bg-muted/60 text-muted-foreground capitalize">
                        {file.visibility}
                      </Badge>
                    </CardContent>
                  </Card>
                )
              )
            )}
          </div>
        }
        billingContent={
          project.clientId ? (
            <ProjectBillingTab
              project={{
                id: project.id,
                name: project.name,
                clientId: project.clientId,
                billingType: project.billingModel ?? project.billingType,
                currency: project.currency,
                budget: project.billingModel === "retainer" ? project.retainerFee : project.budget,
                rate: project.rate,
                packagePrice: selectedPackage?.price ?? null,
                packageCustomPrice: selectedPackage?.customPrice ?? null,
                agreedAmount: resolveProjectAmount({
                  billingType: project.billingType,
                  budget:
                    project.billingModel === "retainer" && project.retainerFee
                      ? Number(project.retainerFee)
                      : project.budget
                        ? Number(project.budget)
                        : null,
                  rate: project.rate ? Number(project.rate) : null,
                  packagePrice:
                    Number(selectedPackage?.customPrice ?? selectedPackage?.price ?? 0) || null,
                }),
                priorActiveFixedBilledAmount:
                  sourceOptions.get(project.id)?.priorActiveFixedBilledAmount ?? 0,
                eligibleTimeEntries: sourceOptions.get(project.id)?.eligibleTimeEntries ?? [],
              }}
              client={{
                id: project.clientId,
                name: project.clientName ?? "Klien",
                companyName: null,
              }}
              invoices={projectInvoices}
              proposedInvoiceNumber={proposedInvoiceNumber}
              baseCurrency={workspace?.defaultCurrency ?? "IDR"}
              currencyRates={currencyRates}
              retainerPeriod={retainerPeriod ?? null}
            />
          ) : null
        }
        timeContent={
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
            clients={
              project.clientId && project.clientName
                ? [{ id: project.clientId, name: project.clientName }]
                : []
            }
            projects={projectOptions}
            tasks={projectTasks.map((task) => ({ id: task.id, title: task.title, projectId }))}
          />
        }
      />
    </div>
  );
}
