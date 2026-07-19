import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  clients,
  projects,
  tasks,
  files,
  invoices,
  appointments,
  portalRequests,
  packages,
  timeEntries,
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
  MessageSquare,
  ArrowLeft,
  Receipt,
  Users,
  Download,
  Wallet,
} from "lucide-react";
import { PortalTokenSection } from "./portal-section";
import { PortalRequestAdmin } from "@/components/portal/portal-request-admin";
import { ClientEditDialog } from "@/components/clients/client-edit-dialog";
import { ClientGoogleCalendarPanel } from "@/components/clients/client-google-calendar-panel";
import { billingTypeLabel } from "@/lib/feature-access";
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
    "overview",
    "projects",
    "files",
    "invoices",
    "calendar",
    "portal",
    "notes",
  ]);
  // Legacy deep-link ?tab=appointments → Calendar
  const initialTab =
    tabParam === "appointments"
      ? "calendar"
      : tabParam && allowedTabs.has(tabParam)
        ? tabParam
        : "overview";

  try {
    await assertClientInWorkspace(db, user.id, workspaceId, clientId);
  } catch {
    notFound();
  }

  const [client] = await db.select().from(clients).where(eq(clients.id, clientId));
  if (!client) notFound();

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

  // Files
  const clientFiles = await db
    .select()
    .from(files)
    .where(eq(files.clientId, clientId))
    .orderBy(desc(files.createdAt))
    .limit(20);

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

  const clientPortalRequests = await db
    .select({
      id: portalRequests.id,
      title: portalRequests.title,
      description: portalRequests.description,
      type: portalRequests.type,
      status: portalRequests.status,
      dueDate: portalRequests.dueDate,
      projectId: portalRequests.projectId,
    })
    .from(portalRequests)
    .where(eq(portalRequests.clientId, clientId))
    .orderBy(desc(portalRequests.createdAt));

  // Notes — use internal notes field + comments on visible projects
  // (no direct client comments in schema)

  // Active projects count
  const activeProjects = clientProjects.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Link href="/app/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3 w-3" /> Kembali ke Klien
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{client.name}</h1>
            <Badge variant={client.status === "active" ? "default" : "secondary"}>
              {client.status === "active" ? "Aktif" : client.status === "inactive" ? "Tidak aktif" : client.status === "archived" ? "Arsip" : client.status}
            </Badge>
          </div>
          {client.companyName && (
            <p className="text-sm text-muted-foreground">{client.companyName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <ClientEditDialog
            defaultValues={{
              id: client.id,
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Proyek Aktif</p>
            <p className="text-2xl font-bold">{activeProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Invoice Belum Lunas</p>
            <p className="text-2xl font-bold">
              {clientInvoices.filter((i) => i.status !== "paid" && i.status !== "cancelled").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Berkas</p>
            <p className="text-2xl font-bold">{clientFiles.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Portal</p>
            <p className="text-2xl font-bold">
              {client.portalEnabled ? (
                <span className="flex items-center gap-1 text-green-600 text-base">
                  <Globe className="h-4 w-4" /> Aktif
                </span>
              ) : (
                <span className="text-muted-foreground text-base">Nonaktif</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Contact Info Row */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {client.email && (
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p>{client.email}</p>
              </div>
            )}
            {client.phone && (
              <div>
                <p className="text-xs text-muted-foreground">Telepon</p>
                <p>{client.phone}</p>
              </div>
            )}
            {client.website && (
              <div>
                <p className="text-xs text-muted-foreground">Website</p>
                <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.website}
                </a>
              </div>
            )}
            {client.address && (
              <div>
                <p className="text-xs text-muted-foreground">Alamat</p>
                <p className="truncate">{client.address}</p>
              </div>
            )}
          </div>
          {client.tags && client.tags.length > 0 && (
            <div className="flex gap-1 mt-3 flex-wrap">
              {client.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px]">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          {client.internalNotes && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-muted-foreground">Catatan Internal</p>
              <p className="text-sm mt-1">{client.internalNotes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1">
            <Users className="h-3 w-3" /> Ringkasan
          </TabsTrigger>
          <TabsTrigger value="projects" className="gap-1">
            <FileText className="h-3 w-3" /> Proyek ({clientProjects.length})
          </TabsTrigger>
          <TabsTrigger value="files" className="gap-1">
            <FileText className="h-3 w-3" /> Berkas ({clientFiles.length})
          </TabsTrigger>
          <TabsTrigger value="invoices" className="gap-1">
            <Receipt className="h-3 w-3" /> Invoice ({clientInvoices.length})
          </TabsTrigger>
          <TabsTrigger value="calendar" className="gap-1">
            <Calendar className="h-3 w-3" /> Calendar
          </TabsTrigger>
          <TabsTrigger value="portal" className="gap-1">
            <Globe className="h-3 w-3" /> Portal
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1">
            <MessageSquare className="h-3 w-3" /> Catatan
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 pt-4">
          <PortalTokenSection client={client} />
        </TabsContent>

        <TabsContent value="portal" className="space-y-4 pt-4">
          <PortalTokenSection client={client} />
          <PortalRequestAdmin
            clientId={client.id}
            initialRequests={clientPortalRequests}
            projects={clientProjects.map((project) => ({ id: project.id, name: project.name }))}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4 pt-4">
          {clientProjects.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada proyek</p>
          )}
          {clientProjects.map((project) => {
            const usedHours = project.usedMinutes / 60;
            const packageHours = project.packageHours;
            const isPackage = project.billingType === "package";
            const isHours = project.billingType === "hours";
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
              : project.billingType === "project" && project.budget
                ? `Budget ${project.currency} ${Number(project.budget).toLocaleString("id-ID")}`
                : isPackage
                  ? project.packageName
                    ? `${project.packageName}${
                        packageHours != null ? ` · ${packageHours} jam` : ""
                      }`
                    : "Billing paket · paket belum dipilih"
                  : "Billing per proyek";

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
                        {billingTypeLabel(project.billingType, "id")}
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

        <TabsContent value="files" className="space-y-4 pt-4">
          {clientFiles.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada berkas diunggah</p>
          )}
          {clientFiles.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.mimeType} · {file.sizeBytes ? `${(file.sizeBytes / 1024).toFixed(1)} KB` : "Ukuran tidak diketahui"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{file.visibility}</Badge>
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <a href={`/api/files/${file.id}/download`} target="_blank" rel="noopener noreferrer">
                      <Download className="h-3 w-3" /> Buka
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 pt-4">
          {clientInvoices.length === 0 && (
            <p className="text-sm text-muted-foreground py-8 text-center">Belum ada invoice</p>
          )}
          {clientInvoices.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{inv.invoiceNumber}</p>
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

        <TabsContent value="notes" className="space-y-4 pt-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium">Catatan Internal</h4>
              <p className="text-sm text-muted-foreground mt-1">
                {client.internalNotes || "Belum ada catatan internal."}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
