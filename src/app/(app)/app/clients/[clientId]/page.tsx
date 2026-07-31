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
} from "@/db/schema";
import { eq, desc, sql, inArray, and } from "drizzle-orm";
import { requireUser, assertClientInWorkspace } from "@/lib/access";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Globe,
  FileText,
  Calendar,
  ArrowLeft,
  Receipt,
  Download,
  Wallet,
} from "lucide-react";
import { PortalTokenSection } from "./portal-section";
import { ClientEditDialog } from "@/components/clients/client-edit-dialog";
import { ClientGoogleCalendarPanel } from "@/components/clients/client-google-calendar-panel";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { billingTypeLabel } from "@/lib/feature-access";
import { checkEntityLimit, getUserPlan } from "@/lib/plan";
import { decryptSecret } from "@/lib/google-calendar";
import {
  getClientGoogleConnectionStatus,
  listClientGoogleEvents,
} from "@/lib/client-google-calendar";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
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

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)]">
        {/* Client profile */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link href="/app/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-3 w-3" /> Kembali ke Klien
            </Link>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <a href={`/api/clients/${client.id}/export/xlsx`} download>
                  <Download className="h-3 w-3" /> Excel
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
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="app-page-title leading-tight">{client.name}</h1>
                  <Badge variant={client.status === "active" ? "default" : "secondary"}>
                    {client.status === "active" ? "Aktif" : client.status === "inactive" ? "Tidak aktif" : client.status === "archived" ? "Arsip" : client.status}
                  </Badge>
                </div>
                {client.companyName && (
                  <p className="text-sm text-muted-foreground">{client.companyName}</p>
                )}
                {(client.email || client.phone) && (
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {client.email && (
                      <a href={`mailto:${client.email}`} className="block break-all hover:text-foreground hover:underline">
                        {client.email}
                      </a>
                    )}
                    {client.phone && (
                      <a href={`tel:${client.phone}`} className="block hover:text-foreground hover:underline">
                        {client.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Proyek Aktif</p>
                  <p className="mt-1 text-xl font-bold">{activeProjects}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Invoice Belum Lunas</p>
                  <p className="mt-1 text-xl font-bold">
                    {clientInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-[11px] text-muted-foreground">Portal</p>
                  {client.portalEnabled ? (
                    <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-green-600">
                      <Globe className="h-4 w-4" /> Aktif
                    </p>
                  ) : (
                    <p className="mt-1 text-sm font-semibold text-muted-foreground">Nonaktif</p>
                  )}
                </div>
              </div>

              {(client.website || client.address || (client.tags && client.tags.length > 0) || client.internalNotes) && (
                <div className="space-y-3 border-t pt-3 text-sm">
                  {client.website && (
                    <div>
                      <p className="text-xs text-muted-foreground">Website</p>
                      <a href={client.website} target="_blank" rel="noopener noreferrer" className="break-all text-blue-600 hover:underline">
                        {client.website}
                      </a>
                    </div>
                  )}
                  {client.address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Alamat</p>
                      <p className="mt-1 break-words">{client.address}</p>
                    </div>
                  )}
                  {client.tags && client.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {client.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {client.internalNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Catatan Internal</p>
                      <p className="mt-1 leading-relaxed">{client.internalNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        {/* Work tabs */}
        <section className="min-w-0">
      {/* Tabs — Ringkasan di-hide, Portal tetap; wrap di mobile */}
      <Tabs defaultValue={initialTab}>
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto min-h-9 w-full flex-wrap justify-start gap-1 p-1">
            <TabsTrigger value="portal" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm" asChild>
              <Link href={`?tab=portal`}><Globe className="h-3 w-3 shrink-0" /> Portal</Link>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm" asChild>
              <Link href={`?tab=projects`}>
                <FileText className="h-3 w-3 shrink-0" /> Proyek ({clientProjects.length})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm" asChild>
              <Link href={`?tab=invoices`}>
                <Receipt className="h-3 w-3 shrink-0" /> Invoice ({clientInvoices.length})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1 px-2.5 text-xs sm:px-3 sm:text-sm" asChild>
              <Link href={`?tab=calendar`}>
                <Calendar className="h-3 w-3 shrink-0" /> Calendar
              </Link>
            </TabsTrigger>

          </TabsList>
        </div>

        <TabsContent value="portal" className="space-y-4 pt-4">
          <PortalTokenSection
            client={client}
            existingPortalToken={existingPortalToken}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 pt-4">
          {canWrite && (
            <div className="flex justify-end">
              <ProjectCreateDialog
                clients={[]}
                clientId={clientId}
                isAtLimit={!projectLimitState.allowed}
                projectCount={projectLimitState.current}
                projectLimit={projectLimitState.limit}
              />
            </div>
          )}
          {clientProjects.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada proyek</p>
          )}
          {clientProjects.map((project) => {
            const usedHours = project.usedMinutes / 60;
            const packageHours = project.packageHours;
            const billingDisplayType = project.billingModel ?? project.billingType;
            const isPackage = billingDisplayType === "package";
            const isHours = billingDisplayType === "hourly" || billingDisplayType === "hours";
            const progressPercent = isPackage
              ? project.packageUsedPercent
              : project.taskCount > 0
                ? Math.round((project.doneCount / project.taskCount) * 100)
                : null;
            const progressLabel = isPackage
              ? packageHours != null
                ? `${usedHours.toFixed(1)}/${packageHours} jam terpakai`
                : project.selectedPackageId
                  ? `${usedHours.toFixed(1)} jam terpakai`
                  : "Paket belum dipilih"
              : isHours
                ? `${usedHours.toFixed(1)} jam tercatat`
                : `${project.doneCount}/${project.taskCount} tugas selesai`;
            const billingMeta = isHours && project.rate
              ? `Rate ${project.currency} ${Number(project.rate).toLocaleString("id-ID")}/jam`
              : billingDisplayType === "fixed_price" && project.budget
                ? `Fixed rate ${project.currency} ${Number(project.budget).toLocaleString("id-ID")}`
                : isPackage
                  ? project.packageName
                    ? `${project.packageName}${
                        packageHours != null ? ` · ${packageHours} jam` : ""
                      }`
                    : "Billing paket · paket belum dipilih"
                  : billingDisplayType === "retainer"
                    ? "Retainer"
                    : "Fixed Price";

            return (
              <Card key={project.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 space-y-1">
                    <Link
                      href={`/app/projects/${project.id}?from=client`}
                      className="font-medium hover:underline"
                    >
                      {project.name}
                    </Link>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{project.status}</Badge>
                      <Badge variant="secondary" className="gap-1 text-[10px] font-normal">
                        <Wallet className="h-3 w-3" />
                        {billingTypeLabel(billingDisplayType, "id")}
                      </Badge>
                      <span>{progressLabel}</span>
                      {project.dueDate && <span>Tenggat: {project.dueDate}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{billingMeta}</p>
                  </div>
                  {progressPercent != null && (
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-[10px] tabular-nums text-muted-foreground">
                        {progressPercent}%
                      </span>
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full ${
                            progressPercent >= 100
                              ? "bg-amber-500"
                              : progressPercent >= 80
                                ? "bg-orange-500"
                                : "bg-emerald-500"
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
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 pt-4">
          {clientInvoices.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada invoice</p>
          )}
          {clientInvoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-0">
                <Link
                  href={`/app/invoices/${inv.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                <div>
                  <p className="text-sm font-medium hover:underline">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground">
                    {inv.issueDate} · Tenggat: {inv.dueDate ?? "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={inv.status === "overdue" ? "destructive" : inv.status === "paid" ? "default" : "secondary"}
                    className="text-[10px]"
                  >
                    {inv.status}
                  </Badge>
                  <span className="text-sm font-semibold">{inv.currency} {inv.total}</span>
                </div>
                </Link>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4 pt-4">
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
        </TabsContent>

      </Tabs>
        </section>
      </div>
    </div>
  );
}
