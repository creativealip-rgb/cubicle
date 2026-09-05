import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  clients,
  projects,
  tasks,
  invoices,
  appointments,
  packages,
  timeEntries,
  workspaceMembers,
  workspaceCurrencyRates,
  workspaces,
} from "@/db/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { requireUser, assertClientInWorkspace } from "@/lib/access";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ClientTabsNav } from "@/components/clients/client-tabs-nav";
import Link from "next/link";
import {
  Download,
  Wallet,
  FolderKanban,
  FileSpreadsheet,
  Users,
} from "lucide-react";
import { PortalTokenSection } from "./portal-section";
import { ClientEditDialog } from "@/components/clients/client-edit-dialog";
import { ClientGoogleCalendarPanel } from "@/components/clients/client-google-calendar-panel";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { billingTypeLabel } from "@/lib/feature-access";
import { getProposedInvoiceNumber } from "@/lib/actions/invoices";
import { checkEntityLimit, getUserPlan } from "@/lib/plan";
import { decryptSecret } from "@/lib/google-calendar";
import {
  getClientGoogleConnectionStatus,
  listClientGoogleEvents,
} from "@/lib/client-google-calendar";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { formatMoney } from "@/lib/utils";
import { getCurrentLang, createT } from "@/lib/i18n";
import { resolveClientPortalActive } from "@/lib/client-portal-status";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";
import { ClientInvoiceCreateDialog } from "@/components/invoices/client-invoice-create-dialog";
import { loadInvoiceSourceProjectOptions } from "@/lib/invoice-source-options";
import { resolveProjectAmount } from "@/lib/invoice-project-items";

async function _getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const invoiceStatusLabel: Record<string, string> = {
    draft: t("Draf", "Draft"), sent: t("Terkirim", "Sent"), viewed: t("Dilihat", "Viewed"),
    paid: t("Lunas", "Paid"), overdue: t("Jatuh tempo", "Overdue"), cancelled: t("Dibatalkan", "Cancelled"), archived: t("Diarsipkan", "Archived"),
  };
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const proposedInvoiceNumber = await getProposedInvoiceNumber();
  const { clientId } = await params;
  const { tab: tabParam } = await searchParams;
  const allowedTabs = new Set([
    "projects",
    "invoices",
    "calendar",
    "portal",
  ]);
  // Legacy deep-link ?tab=appointments → Calendar
  // Ringkasan (overview) di-hide; deep-link lama fallback ke projects
  const initialTab =
    tabParam === "appointments"
      ? "calendar"
      : tabParam === "overview"
        ? "projects"
        : tabParam && allowedTabs.has(tabParam)
          ? tabParam
          : "portal";

  try {
    await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  } catch {
    notFound();
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) notFound();

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  const projectLimitState = await checkEntityLimit(
    workspaceId,
    "projects",
    await getUserPlan(user.id),
  );

  let existingPortalToken: string | null = null;
  if (
    client.portalEnabled &&
    client.portalTokenEnc &&
    !client.portalTokenRevokedAt &&
    (!client.portalTokenExpiresAt || client.portalTokenExpiresAt > new Date())
  ) {
    try {
      existingPortalToken = decryptSecret(client.portalTokenEnc);
    } catch {
      existingPortalToken = null;
    }
  }

  // Google Calendar client (separate from user calendar)
  const clientGcalStatus = await getClientGoogleConnectionStatus(clientId);
  let clientGcalEvents: Awaited<ReturnType<typeof listClientGoogleEvents>>["events"] = [];
  let clientGcalEventsError: string | null = null;
  if (clientGcalStatus.connected) {
    const listed = await listClientGoogleEvents(clientId);
    clientGcalEvents = listed.events;
    clientGcalEventsError = listed.error ?? null;
  }

  // Projects
  const clientProjectsRaw = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      billingType: projects.billingType,
      billingModel: projects.billingModel,
      currency: projects.currency,
      rate: projects.rate,
      budget: projects.budget,
      selectedPackageId: projects.selectedPackageId,
      taskCount: sql<number>`count(${tasks.id})::int`,
      doneCount: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
      trackedMinutes: sql<number>`coalesce((select sum(te.duration_minutes) from time_entries te where te.project_id = ${projects.id}), 0)::int`,
      retainerIncludedMinutes: projects.retainerIncludedMinutes,
    })
    .from(projects)
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(eq(projects.clientId, clientId))
    .groupBy(projects.id)
    .orderBy(desc(projects.createdAt));

  // Package catalog + billable time usage for package/hours progress
  const packageIds = [
    ...new Set(
      clientProjectsRaw
        .map((p) => p.selectedPackageId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const packageById = new Map<
    string,
    { name: string; hours: number | null; price: string }
  >();
  if (packageIds.length > 0) {
    const pkgs = await db
      .select({
        id: packages.id,
        name: packages.name,
        hours: packages.hours,
        price: packages.price,
      })
      .from(packages)
      .where(inArray(packages.id, packageIds));
    for (const pkg of pkgs) {
      packageById.set(pkg.id, {
        name: pkg.name,
        hours: pkg.hours,
        price: String(pkg.price),
      });
    }
  }

  const projectIds = clientProjectsRaw.map((p) => p.id);
  const usedMinutesByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const usageRows = await db
      .select({
        projectId: timeEntries.projectId,
        usedMinutes: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)::int`,
      })
      .from(timeEntries)
      .where(
        and(
          inArray(timeEntries.projectId, projectIds),
          eq(timeEntries.billable, true),
        ),
      )
      .groupBy(timeEntries.projectId);
    for (const row of usageRows) {
      if (!row.projectId) continue;
      usedMinutesByProject.set(row.projectId, Number(row.usedMinutes) || 0);
    }
  }

  const clientProjects = clientProjectsRaw.map((project) => {
    const pkg = project.selectedPackageId
      ? packageById.get(project.selectedPackageId) ?? null
      : null;
    const usedMinutes = usedMinutesByProject.get(project.id) ?? 0;
    const packageHours = pkg?.hours ?? null;
    const packageMinutes =
      packageHours != null && packageHours > 0 ? packageHours * 60 : null;
    const packageUsedPercent =
      packageMinutes != null && packageMinutes > 0
        ? Math.min(100, Math.round((usedMinutes / packageMinutes) * 100))
        : null;
    return {
      ...project,
      packageName: pkg?.name ?? null,
      packageHours,
      packagePrice: pkg?.price ?? null,
      usedMinutes,
      packageUsedPercent,
    };
  });

  // Invoices
  const sourceOptions = await loadInvoiceSourceProjectOptions({ workspaceId, clientId, projectIds });
  const [workspace] = await db.select({ defaultCurrency: workspaces.defaultCurrency }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currencyRates = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));

  const clientInvoices = await db
    .select()
    .from(invoices)
    .where(eq(invoices.clientId, clientId))
    .orderBy(desc(invoices.createdAt));

  // Appointments
  const clientAppointments = await db
    .select()
    .from(appointments)
    .where(eq(appointments.clientId, clientId))
    .orderBy(desc(appointments.startTime));

  // Notes — use internal notes field + comments on visible projects
  // (no direct client comments in schema)

  // Active projects count
  const activeProjects = clientProjects.filter((p) => p.status === "active").length;
  const portalActive = resolveClientPortalActive(client);
  const projectStatusLabels: Record<string, string> = {
    draft: "Draf",
    active: "Aktif",
    review: "Review",
    on_hold: "Ditunda",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    archived: "Diarsipkan",
  };

  return (
    <div className="space-y-6">
      {/* Unified Executive PageHeader with Integrated Breadcrumb */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-r from-card via-card to-primary/[0.04] p-3 sm:p-3.5 shadow-xs transition-all">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              {/* Breadcrumb row */}
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                <Link
                  href="/app/clients"
                  className="transition-colors hover:text-primary hover:underline"
                >
                  {t("Klien", "Clients")}
                </Link>
                <span>/</span>
                <span className="text-foreground/80 truncate max-w-[180px]">{client.name}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-foreground truncate leading-tight">
                  {client.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-bold h-4.5 px-2 rounded-full border ${
                    client.status === "active"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : "border-border/80 bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`mr-1 h-1.5 w-1.5 rounded-full ${
                      client.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"
                    }`}
                  />
                  {client.status === "active"
                    ? t("Aktif", "Active")
                    : client.status === "inactive"
                      ? t("Tidak aktif", "Inactive")
                      : client.status === "archived"
                        ? t("Arsip", "Archived")
                        : client.status}
                </Badge>
                {client.companyName && (
                  <span className="text-xs font-medium text-muted-foreground truncate before:content-['·'] before:mr-2">
                    {client.companyName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Group */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0 sm:self-center">
            <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold shadow-xs" asChild>
              <a href={`/api/clients/${client.id}/export/xlsx`} download>
                <Download className="h-3.5 w-3.5 text-muted-foreground" /> Excel
              </a>
            </Button>
            <ClientEditDialog
              defaultValues={{
                id: client.id,
                clientNumber: client.clientNumber,
                name: client.name,
                companyName: client.companyName ?? "",
                email: client.email ?? "",
                phone: client.phone ?? "",
                website: client.website ?? "",
                address: client.address ?? "",
                tags: client.tags ?? [],
                internalNotes: client.internalNotes ?? "",
                portalSlug: client.portalSlug ?? "",
                portalSlugEnabled: client.portalSlugEnabled ?? true,
              }}
            />
            <PermanentDeleteButton
              entityType="client"
              entityId={client.id}
              entityName={client.name}
              redirectTo="/app/clients"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Client profile */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Card className="rounded-2xl border border-border/80 shadow-xs">
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Ringkasan Klien", "Client Summary")}
                </p>
                {(client.email || client.phone) && (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="block break-all hover:text-primary hover:underline">
                        {client.email}
                      </a>
                    )}
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="block hover:text-primary hover:underline">
                        {client.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("Proyek Aktif", "Active Projects")}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{activeProjects}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-[11px] font-medium text-muted-foreground">{t("Invoice Belum Lunas", "Unpaid Invoices")}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">
                    {clientInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length}
                  </p>
                </div>
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3">
                  <p className="text-[11px] text-muted-foreground">Portal</p>
                  {portalActive ? (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> {t("Aktif", "Active")}
                    </p>
                  ) : (
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> {t("Nonaktif", "Inactive")}
                    </p>
                  )}
                </div>
              </div>

              {(client.website || client.address || (client.tags && client.tags.length > 0) || client.internalNotes) && (
                <div className="space-y-3 border-t pt-3 text-xs">
                  {client.website && (
                    <div>
                      <p className="font-semibold text-muted-foreground">Website</p>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="break-all text-primary hover:underline">
                        {client.website}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div>
                      <p className="font-semibold text-muted-foreground">{t("Alamat", "Address")}</p>
                      <p className="mt-0.5 break-words text-foreground">{client.address}</p>
                    </div>
                  )}
                  {client.tags && client.tags.length > 0 && (
                    <div>
                      <p className="font-semibold text-muted-foreground mb-1">{t("Tag", "Tags")}</p>
                      <div className="flex flex-wrap gap-1">
                        {client.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px] rounded-md font-medium">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {client.internalNotes && (
                    <div>
                      <p className="font-semibold text-muted-foreground">{t("Catatan Internal", "Internal notes")}</p>
                      <p className="mt-0.5 leading-relaxed text-foreground bg-muted/30 p-2.5 rounded-xl border border-border/50">
                        {client.internalNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Work tabs */}
        <section className="min-w-0">
      <ClientTabsNav
        initialTab={initialTab}
        projectsCount={clientProjects.length}
        invoicesCount={clientInvoices.length}
        projectsAction={
          canWrite ? (
            <ProjectCreateDialog
              clients={[]}
              clientId={clientId}
              isAtLimit={!projectLimitState.allowed}
              projectCount={projectLimitState.current}
              projectLimit={projectLimitState.limit}
            />
          ) : null
        }
        invoicesAction={
          canWrite ? (
            <ClientInvoiceCreateDialog
              client={{ id: client.id, name: client.name, companyName: client.companyName }}
              proposedInvoiceNumber={proposedInvoiceNumber}
              projects={clientProjects.map((project) => ({
                id: project.id,
                name: project.name,
                clientId: client.id,
                billingType: project.billingModel ?? project.billingType,
                currency: project.currency,
                budget: project.budget,
                rate: project.rate,
                packagePrice: project.packagePrice,
                packageCustomPrice: null,
                agreedAmount: resolveProjectAmount({
                  billingType: project.billingModel ?? project.billingType,
                  budget: project.budget ? Number(project.budget) : null,
                  rate: project.rate ? Number(project.rate) : null,
                  packagePrice: Number(project.packagePrice ?? 0) || null,
                }),
                priorActiveFixedBilledAmount:
                  sourceOptions.get(project.id)?.priorActiveFixedBilledAmount ?? 0,
                eligibleTimeEntries: sourceOptions.get(project.id)?.eligibleTimeEntries ?? [],
              }))}
              baseCurrency={workspace?.defaultCurrency ?? "IDR"}
              currencyRates={currencyRates}
            />
          ) : null
        }
        portalContent={
          <PortalTokenSection
            client={{ ...client, portalPasswordCiphertext: client.portalPasswordCiphertext }}
            existingPortalToken={existingPortalToken}
          />
        }
        projectsContent={
          <div className="space-y-4">
            {clientProjects.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("Belum ada proyek", "No projects yet")}
              </p>
            )}
            {clientProjects.map((project) => {
              const usedHours = project.usedMinutes / 60;
              const packageHours = project.packageHours;
              const billingDisplayType = project.billingModel ?? project.billingType;
              const isPackage = billingDisplayType === "package";
              const isHours = billingDisplayType === "hourly" || billingDisplayType === "hours";
              const isRetainer = billingDisplayType === "retainer";
              const retainerIncluded =
                project.retainerIncludedMinutes && project.retainerIncludedMinutes > 0
                  ? project.retainerIncludedMinutes
                  : null;
              const progressPercent = isPackage
                ? project.packageUsedPercent
                : isRetainer
                  ? retainerIncluded
                    ? Math.min(100, Math.round((project.trackedMinutes / retainerIncluded) * 100))
                    : project.taskCount > 0
                      ? Math.round((project.doneCount / project.taskCount) * 100)
                      : null
                  : project.taskCount > 0
                    ? Math.round((project.doneCount / project.taskCount) * 100)
                    : null;
              const progressLabel = isPackage
                ? packageHours != null
                  ? `${usedHours.toFixed(1)}/${packageHours} ${t("jam terpakai", "hrs used")}`
                  : project.selectedPackageId
                    ? `${usedHours.toFixed(1)} ${t("jam terpakai", "hrs used")}`
                    : t("Paket belum dipilih", "Package not selected")
                : isHours
                  ? `${usedHours.toFixed(1)} ${t("jam tercatat", "hrs logged")}`
                  : isRetainer
                    ? retainerIncluded
                      ? `${usedHours.toFixed(0)} / ${(retainerIncluded / 60).toFixed(0)} ${t("jam terpakai", "hrs used")}`
                      : `${usedHours.toFixed(1)} ${t("jam tercatat", "hrs logged")}`
                    : `${project.doneCount}/${project.taskCount} ${t("tugas selesai", "tasks done")}`;
              const billingMeta =
                isHours && project.rate
                  ? `Rate ${project.currency} ${Number(project.rate).toLocaleString("id-ID")}/${t("jam", "hr")}`
                  : billingDisplayType === "fixed_price" && project.budget
                    ? `Fixed rate ${project.currency} ${Number(project.budget).toLocaleString("id-ID")}`
                    : isPackage
                      ? project.packageName
                        ? `${project.packageName}${
                            packageHours != null ? ` · ${packageHours} ${t("jam", "hr")}` : ""
                          }`
                        : t("Billing paket · paket belum dipilih", "Package billing · package not selected")
                      : billingDisplayType === "retainer"
                        ? "Retainer"
                        : "Fixed Price";

              return (
                <Card
                  key={project.id}
                  className="overflow-hidden rounded-2xl border border-border/80 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
                >
                  <CardContent className="flex flex-col gap-3 p-3.5 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <Link
                          href={`/app/projects/${project.id}?from=client`}
                          className="font-bold text-sm text-foreground hover:text-primary hover:underline truncate block"
                        >
                          {project.name}
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold h-5 px-2 rounded-full border ${
                              project.status === "active"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                : "border-border/80 bg-muted/60 text-muted-foreground"
                            }`}
                          >
                            <span className={`mr-1 h-1.5 w-1.5 rounded-full ${project.status === "active" ? "bg-blue-600" : "bg-muted-foreground"}`} />
                            {projectStatusLabels[project.status] ?? project.status}
                          </Badge>
                          <Badge variant="secondary" className="gap-1 text-[10px] font-semibold h-5 px-2 rounded-full border border-border/80 bg-muted/60 text-muted-foreground">
                            <Wallet className="h-3 w-3 text-muted-foreground" />
                            {billingTypeLabel(billingDisplayType, lang)}
                          </Badge>
                          <span className="text-[11px]">{progressLabel}</span>
                          {project.dueDate && (
                            <span className="text-[11px]">
                              · {t("Tenggat", "Due")}: {project.dueDate}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{billingMeta}</p>
                      </div>
                    </div>
                    {progressPercent != null && (
                      <div className="flex shrink-0 flex-col items-end gap-1 sm:self-center">
                        <span className="text-[10px] font-mono font-bold text-muted-foreground">
                          {progressPercent}%
                        </span>
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full rounded-full transition-all ${
                              progressPercent >= 100
                                ? "bg-emerald-500"
                                : progressPercent >= 80
                                  ? "bg-amber-500"
                                  : "bg-primary"
                            }`}
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        }
        invoicesContent={
          <div className="space-y-4">
            {clientInvoices.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("Belum ada invoice", "No invoices yet")}
              </p>
            )}
            {clientInvoices.map((inv) => (
              <Card
                key={inv.id}
                className="overflow-hidden rounded-2xl border border-border/80 transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <CardContent className="p-0">
                  <Link
                    href={buildInvoiceDetailUrl(inv.id, { type: "client", resourceId: clientId })}
                    className="flex items-center justify-between p-3.5 sm:p-4 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className="text-sm font-bold text-foreground hover:text-primary truncate">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {inv.issueDate} · {t("Tenggat", "Due")}: {inv.dueDate ?? "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold h-5 px-2 rounded-full border ${
                          inv.status === "overdue"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                            : inv.status === "paid"
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                              : "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                        }`}
                      >
                        <span
                          className={`mr-1 h-1.5 w-1.5 rounded-full ${
                            inv.status === "overdue"
                              ? "bg-rose-600"
                              : inv.status === "paid"
                                ? "bg-emerald-600"
                                : "bg-blue-600"
                          }`}
                        />
                        {invoiceStatusLabel[inv.status] ?? inv.status}
                      </Badge>
                      <span className="font-mono text-sm font-bold text-foreground">
                        {formatMoney(inv.total, inv.currency)}
                      </span>
                    </div>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        }
        calendarContent={
          <ClientGoogleCalendarPanel
            clientId={client.id}
            configured={clientGcalStatus.configured}
            connected={clientGcalStatus.connected}
            pendingInvite={clientGcalStatus.pendingInvite}
            email={clientGcalStatus.connection?.googleAccountEmail ?? null}
            status={clientGcalStatus.connection?.status ?? null}
            lastError={clientGcalStatus.connection?.lastError ?? null}
            connectedAt={clientGcalStatus.connection?.connectedAt?.toISOString() ?? null}
            events={clientGcalEvents}
            eventsError={clientGcalEventsError}
            appointments={clientAppointments.map((apt) => ({
              id: apt.id,
              title: apt.title,
              startTime: apt.startTime,
              endTime: apt.endTime,
              status: apt.status,
              attendeeName: apt.attendeeName,
              attendeeEmail: apt.attendeeEmail,
            }))}
          />
        }
      />
        </section>
      </div>
    </div>
  );
}
