import { headers } from "next/headers";
import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  projects,
  tasks,
  files,
  invoices,
  portalVisits,
  portalRequests,
  activityLogs,
  timeEntries,
  users,
  packages,
  workspaces,
} from "@/db/schema";
import { eq, and, sql, desc, inArray, ne } from "drizzle-orm";
import { getClientPortalAccess, logPortalAccess } from "@/lib/actions/portal";

function formatIDR(amount: number) {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  DollarSign,
  Clock,
  AlertCircle,
  Download,
  BarChart3,
  Calendar,
  FileText,
  Activity,
} from "lucide-react";
import { PortalContactButtons } from "@/components/portal/portal-contact";
import { ProjectAccordion } from "@/components/portal/project-accordion";
import { ActivityFeed, type ActivityItem } from "@/components/portal/activity-feed";
import { PortalInvoices } from "@/components/portal/portal-invoices";
import { getCustomPackageRequestsByToken } from "@/lib/actions/custom-package-requests";
import { getPackageOrdersByToken } from "@/lib/actions/package-orders";

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let client;
  try {
    client = await getClientPortalAccess(token);
  } catch {
    notFound();
  }

  // Log access
  try {
    const headersList = await headers();
    await logPortalAccess({
      workspaceId: client.workspaceId,
      clientId: client.id,
      tokenType: "client_portal",
      tokenHashPrefix: token.slice(0, 8),
      ipAddress: headersList.get("x-forwarded-for") || undefined,
      userAgent: headersList.get("user-agent") || undefined,
    });
  } catch {
    // Non-critical
  }

  const [workspaceContact] = await db
    .select({
      name: workspaces.name,
      phone: workspaces.billingPhone,
      email: workspaces.billingEmail,
      replyToEmail: workspaces.replyToEmail,
      logoUrl: workspaces.logoUrl,
    })
    .from(workspaces)
    .where(eq(workspaces.id, client.workspaceId))
    .limit(1);

  // Fetch visible projects
  const clientProjects = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      clientVisible: projects.clientVisible,
      billingType: projects.billingType,
      rate: projects.rate,
      budget: projects.budget,
      currency: projects.currency,
      startDate: projects.startDate,
      finishDate: projects.finishDate,
      selectedPackageId: projects.selectedPackageId,
    })
    .from(projects)
    .where(
      and(
        eq(projects.workspaceId, client.workspaceId),
        eq(projects.clientId, client.id),
        eq(projects.clientVisible, true),
      ),
    );

  // Fetch all tasks for visible projects in one query
  const visibleProjectIds = clientProjects.map((p) => p.id);
  let allVisibleTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    priority: string;
    dueDate: string | null;
    updatedAt: Date;
    projectId: string;
  }> = [];

  if (visibleProjectIds.length > 0) {
    // eslint-disable-next-line unused-imports/no-unused-vars -- value used via typeof in projectTasksMap below
    allVisibleTasks = await db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.clientVisible, true),
          // We need to check projectId is in visibleProjectIds
          // Using SQL-level filter
        ),
      )
      .limit(500);
  }

  // Actually filter by project IDs using a more targeted approach
  const projectTasksMap = new Map<string, typeof allVisibleTasks>();
  if (visibleProjectIds.length > 0) {
    for (const projectId of visibleProjectIds) {
      const projectTasks = await db
        .select({
          id: tasks.id,
          title: tasks.title,
          description: tasks.description,
          status: tasks.status,
          priority: tasks.priority,
          dueDate: tasks.dueDate,
          updatedAt: tasks.updatedAt,
          projectId: tasks.projectId,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.projectId, projectId),
            eq(tasks.clientVisible, true),
          ),
        )
        .limit(100);
      projectTasksMap.set(projectId, projectTasks);
    }
  }

  // Fetch client-visible files per project
  const projectFilesMap = new Map<string, Array<{
    id: string;
    name: string;
    mimeType: string | null;
    sizeBytes: number | null;
    fileType: string;
    createdAt: Date;
  }>>();

  for (const projectId of visibleProjectIds) {
    const projectFiles = await db
      .select({
        id: files.id,
        name: files.name,
        mimeType: files.mimeType,
        sizeBytes: files.sizeBytes,
        fileType: files.fileType,
        createdAt: files.createdAt,
      })
      .from(files)
      .where(
        and(
          eq(files.projectId, projectId),
          eq(files.visibility, "client"),
        ),
      )
      .limit(100);
    projectFilesMap.set(projectId, projectFiles);
  }

  // Track file visibility on portal open: mark files last viewed, audit visits,
  // and notify workspace on first ever portal view per file.
  try {
    const headersList = await headers();
    const ipAddress = headersList.get("x-forwarded-for") || undefined;
    const userAgent = headersList.get("user-agent") || undefined;
    const { notifyWorkspaceMembers } = await import("@/lib/in-app-notifications");
    for (const projectFiles of projectFilesMap.values()) {
      for (const file of projectFiles) {
        const [{ seen = 0 } = {}] = await db
          .select({ seen: sql<number>`count(*)::int` })
          .from(portalVisits)
          .where(and(eq(portalVisits.resourceType, "file"), eq(portalVisits.resourceId, file.id)));

        await db.insert(portalVisits).values({
          workspaceId: client.workspaceId,
          clientId: client.id,
          resourceType: "file",
          resourceId: file.id,
          ipAddress,
          userAgent,
        });

        await db
          .update(files)
          .set({ lastViewedAt: new Date() })
          .where(eq(files.id, file.id));

        if (seen === 0) {
          await notifyWorkspaceMembers(client.workspaceId, {
            type: "file_viewed",
            title: `${client.name} viewed ${file.name}`,
            body: "First portal view",
            link: `/app/files?focus=${file.id}`,
            entityType: "file",
            entityId: file.id,
            actorId: null,
          });
        }
      }
    }
  } catch {
    // non-critical analytics / notification
  }

  // Fetch client-visible comments removed — portal uses WA/email contact only.

  const clientVisibleActionLabels: Record<string, string> = {
    created_project: "Project created",
    updated_project: "Project updated",
    updated_project_visibility: "Project shared",
    created_task: "Task added",
    updated_task: "Task updated",
    updated_task_status: "Task status updated",
    uploaded_file: "File shared",
  };

  const projectTimelineMap = new Map<string, Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date;
  }>>();

  for (const project of clientProjects) {
    const projectTasks = projectTasksMap.get(project.id) || [];
    const projectFiles = projectFilesMap.get(project.id) || [];
    const visibleEntityIds = [
      project.id,
      ...projectTasks.map((task) => task.id),
      ...projectFiles.map((file) => file.id),
    ];

    if (visibleEntityIds.length === 0) {
      projectTimelineMap.set(project.id, []);
      continue;
    }

    const timeline = await db
      .select({
        id: activityLogs.id,
        action: activityLogs.action,
        entityType: activityLogs.entityType,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.workspaceId, client.workspaceId),
          inArray(activityLogs.entityId, visibleEntityIds),
          inArray(activityLogs.action, Object.keys(clientVisibleActionLabels)),
        ),
      )
      .orderBy(desc(activityLogs.createdAt))
      .limit(12);

    projectTimelineMap.set(project.id, timeline);
  }

  // Fetch time entry summaries for "by hours" and assigned-package projects
  const byHoursProjectIds = clientProjects
    .filter((p) => p.billingType === "hours" || (p.billingType === "package" && p.selectedPackageId))
    .map((p) => p.id);

  const projectHoursMap = new Map<string, {
    totalMinutes: number;
    billableMinutes: number;
    entryCount: number;
    tags: string[];
  }>();

  for (const projectId of byHoursProjectIds) {
    const entries = await db
      .select({
        durationMinutes: timeEntries.durationMinutes,
        manualMinutes: timeEntries.manualMinutes,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        billable: timeEntries.billable,
        tags: timeEntries.tags,
      })
      .from(timeEntries)
      .where(eq(timeEntries.projectId, projectId))
      .limit(500);

    let totalMinutes = 0;
    let billableMinutes = 0;
    const allTags = new Set<string>();

    for (const entry of entries) {
      let mins = 0;
      if (entry.manualMinutes) {
        mins = entry.manualMinutes;
      } else if (entry.startTime && entry.endTime) {
        mins = Math.round((new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / 60000);
      }
      totalMinutes += mins;
      if (entry.billable) billableMinutes += mins;
      if (entry.tags) {
        for (const tag of String(entry.tags).split(",")) {
          const t = tag.trim();
          if (t) allTags.add(t);
        }
      }
    }

    projectHoursMap.set(projectId, {
      totalMinutes,
      billableMinutes,
      entryCount: entries.length,
      tags: [...allTags].slice(0, 10),
    });
  }

  // Fetch packages for "by_package" projects
  const byPackageProjectIds = clientProjects
    .filter((p) => p.billingType === "package")
    .map((p) => p.id);

  const projectPackagesMap = new Map<string, Array<{
    id: string;
    name: string;
    hours: number | null;
    price: string;
    currency: string;
    description: string | null;
    features: string | null;
    badge: string | null;
    sortOrder: number;
    customPrice: string | null;
    minHours: number | null;
    maxHours: number | null;
    allowCustom: boolean;
  }>>();

  for (const projectId of byPackageProjectIds) {
    const pkgs = await db
      .select({
        id: packages.id,
        name: packages.name,
        hours: packages.hours,
        price: packages.price,
        currency: packages.currency,
        description: packages.description,
        features: packages.features,
        badge: packages.badge,
        sortOrder: packages.sortOrder,
        customPrice: packages.customPrice,
        minHours: packages.minHours,
        maxHours: packages.maxHours,
        allowCustom: packages.allowCustom,
      })
      .from(packages)
      .where(and(eq(packages.projectId, projectId), eq(packages.active, true)))
      .orderBy(packages.sortOrder);
    projectPackagesMap.set(projectId, pkgs);
  }

  // Fetch custom package requests by token
  const customRequests = await getCustomPackageRequestsByToken(token);

  // Fetch selected package details for package projects with an assigned package
  const selectedPackageMap = new Map<string, {
    id: string;
    name: string;
    hours: number | null;
    price: string;
    currency: string;
  }>();

  const assignedPackageIds = clientProjects
    .filter((p) => p.billingType === "package" && p.selectedPackageId)
    .map((p) => p.selectedPackageId!);

  if (assignedPackageIds.length > 0) {
    const selectedPkgs = await db
      .select({
        id: packages.id,
        name: packages.name,
        hours: packages.hours,
        price: packages.price,
        currency: packages.currency,
      })
      .from(packages)
      .where(inArray(packages.id, assignedPackageIds));

    for (const pkg of selectedPkgs) {
      selectedPackageMap.set(pkg.id, pkg);
    }
  }

  // Fetch package orders by token
  const packageOrdersList = await getPackageOrdersByToken(token);

  // Financial summary — invoices for this client
  const clientInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
      dueDate: invoices.dueDate,
      issueDate: invoices.issueDate,
      projectId: invoices.projectId,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, client.workspaceId),
        eq(invoices.clientId, client.id),
        ne(invoices.status, "archived"),
      ),
    )
    .limit(50);

  // Group invoices by project
  const projectInvoicesMap = new Map<string, typeof clientInvoices>();
  const unlinkedInvoices: typeof clientInvoices = [];
  for (const inv of clientInvoices) {
    if (inv.projectId) {
      const existing = projectInvoicesMap.get(inv.projectId) || [];
      existing.push(inv);
      projectInvoicesMap.set(inv.projectId, existing);
    } else {
      unlinkedInvoices.push(inv);
    }
  }

  // Financial summary — invoices for this client, grouped by currency
  let totalPaidIDR = 0;
  let totalPaidUSD = 0;
  let totalOutstandingIDR = 0;
  let totalOutstandingUSD = 0;
  for (const inv of clientInvoices) {
    const amt = Number(inv.total) || 0;
    const isUSD = inv.currency === "USD";
    if (inv.status === "paid") {
      if (isUSD) totalPaidUSD += amt;
      else totalPaidIDR += amt;
    } else if (inv.status !== "cancelled" && inv.status !== "archived") {
      if (isUSD) totalOutstandingUSD += amt;
      else totalOutstandingIDR += amt;
    }
  }

  // Fetch time entry details for by-hours projects (individual entries)
  const byHoursEntriesMap = new Map<string, Array<{
    id: string;
    description: string | null;
    durationMinutes: number;
    startTime: Date | null;
    endTime: Date | null;
    billable: boolean;
    tags: string | null;
    userName: string | null;
  }>>();

  for (const projectId of byHoursProjectIds) {
    const entries = await db
      .select({
        id: timeEntries.id,
        description: timeEntries.description,
        durationMinutes: timeEntries.durationMinutes,
        manualMinutes: timeEntries.manualMinutes,
        startTime: timeEntries.startTime,
        endTime: timeEntries.endTime,
        billable: timeEntries.billable,
        tags: timeEntries.tags,
        userName: users.name,
      })
      .from(timeEntries)
      .leftJoin(users, eq(users.id, timeEntries.userId))
      .where(eq(timeEntries.projectId, projectId))
      .orderBy(desc(timeEntries.startTime))
      .limit(20);

    byHoursEntriesMap.set(projectId, entries.map(e => ({
      id: e.id,
      description: e.description,
      durationMinutes: e.manualMinutes || e.durationMinutes || 0,
      startTime: e.startTime,
      endTime: e.endTime,
      billable: e.billable ?? true,
      tags: e.tags,
      userName: e.userName,
    })));
  }

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
    .where(
      and(
        eq(portalRequests.workspaceId, client.workspaceId),
        eq(portalRequests.clientId, client.id),
      ),
    )
    .limit(100);

  // Fetch shared invoices
  const sharedInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      status: invoices.status,
      currency: invoices.currency,
      sharedTokenHash: invoices.sharedTokenHash,
      sharedTokenRevokedAt: invoices.sharedTokenRevokedAt,
      sharedTokenExpiresAt: invoices.sharedTokenExpiresAt,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, client.workspaceId),
        eq(invoices.clientId, client.id),
        ne(invoices.status, "archived"),
      ),
    )
    .limit(50);

  // Filter to only those with active shared tokens
  const activeSharedInvoices = sharedInvoices.filter(
    (inv) =>
      inv.sharedTokenHash &&
      !inv.sharedTokenRevokedAt &&
      (inv.sharedTokenExpiresAt
        ? new Date(inv.sharedTokenExpiresAt) > new Date()
        : true),
  );

  // ─── Activity Feed: compact, high-signal only ─────────────────────────
  // Cap noise: few time entries, group task spam per project+day, max 5 rows.
  const activityItems: ActivityItem[] = [];

  // Invoice events (high signal)
  for (const inv of clientInvoices) {
    const projectName = inv.projectId
      ? clientProjects.find((p) => p.id === inv.projectId)?.name || "Unknown Project"
      : "General";
    if (inv.status === "paid") {
      activityItems.push({
        id: `inv-paid-${inv.id}`,
        type: "invoice",
        description: `${inv.invoiceNumber || "Invoice"} paid — ${new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency }).format(Number(inv.total))}`,
        date: new Date(inv.issueDate || inv.dueDate || Date.now()),
        icon: "invoice",
      });
    } else if (inv.status === "sent" || inv.status === "viewed") {
      activityItems.push({
        id: `inv-sent-${inv.id}`,
        type: "invoice",
        description: `${inv.invoiceNumber || "Invoice"} sent — ${new Intl.NumberFormat("en-US", { style: "currency", currency: inv.currency }).format(Number(inv.total))} (${projectName})`,
        date: new Date(inv.issueDate || Date.now()),
        icon: "invoice",
      });
    }
  }

  // Time entries — max 1 newest per project (avoid 8 clock rows)
  for (const [projectId, entries] of byHoursEntriesMap) {
    const projectName = clientProjects.find((p) => p.id === projectId)?.name || "Project";
    const latest = entries[0];
    if (!latest) continue;
    const entryDate = latest.startTime ? new Date(latest.startTime) : new Date();
    activityItems.push({
      id: `te-${latest.id}`,
      type: "time_entry",
      description: `${formatMinutes(latest.durationMinutes)} logged on ${projectName}`,
      date: entryDate,
      icon: "clock",
    });
  }

  // Task events — group same action+project+day so "Task added" x6 collapses
  const taskGroups = new Map<
    string,
    { count: number; latest: Date; action: string; projectName: string }
  >();
  for (const [projectId, timeline] of projectTimelineMap) {
    const projectName = clientProjects.find((p) => p.id === projectId)?.name || "Project";
    for (const event of timeline) {
      if (event.action !== "updated_task_status" && event.action !== "created_task") continue;
      const d = new Date(event.createdAt);
      const dayKey = d.toISOString().slice(0, 10);
      const key = `${event.action}|${projectId}|${dayKey}`;
      const prev = taskGroups.get(key);
      if (!prev) {
        taskGroups.set(key, {
          count: 1,
          latest: d,
          action: event.action,
          projectName,
        });
      } else {
        prev.count += 1;
        if (d > prev.latest) prev.latest = d;
      }
    }
  }
  for (const [key, g] of taskGroups) {
    const label =
      g.action === "updated_task_status"
        ? g.count > 1
          ? `${g.count} task status updates`
          : "Task status updated"
        : g.count > 1
          ? `${g.count} tasks added`
          : "Task added";
    activityItems.push({
      id: `tl-${key}`,
      type: "task",
      description: `${label} in ${g.projectName}`,
      date: g.latest,
      icon: g.action === "updated_task_status" ? "check" : "project",
    });
  }

  // Project creation only if recently created (30 days) — old create spam skip
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  for (const proj of clientProjects) {
    const created = new Date(proj.startDate || Date.now());
    if (nowMs - created.getTime() > thirtyDaysMs) continue;
    activityItems.push({
      id: `proj-${proj.id}`,
      type: "project",
      description: `Project "${proj.name}" created`,
      date: created,
      icon: "project",
    });
  }

  // Sort newest first; keep small pool for "show more" (UI shows 3 first)
  activityItems.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const recentActivities = activityItems.slice(0, 5);


  // ─── Hero helpers ────────────────────────────────────────────────────
  function fmtAmt(idr: number, usd: number) {
    const parts: string[] = [];
    if (idr > 0) parts.push(formatIDR(idr));
    if (usd > 0) parts.push(`$${usd.toLocaleString("en-US", { minimumFractionDigits: 0 })}`);
    return parts.join(" + ") || "—";
  }

  const activeCount = clientProjects.filter((p) => p.status === "active").length;

  // Package hours for hero
  const packageProjects = clientProjects.filter((p) => p.billingType === "package" && p.selectedPackageId);
  let heroPackageLabel: string | null = null;
  let heroPackagePercent: number | null = null;
  if (packageProjects.length > 0) {
    const pkg = packageProjects[0];
    const selectedPkg = selectedPackageMap.get(pkg.selectedPackageId!);
    const hoursSummary = projectHoursMap.get(pkg.id);
    if (selectedPkg?.hours && hoursSummary) {
      const totalH = selectedPkg.hours;
      const usedH = Math.round(hoursSummary.totalMinutes / 60);
      heroPackageLabel = `${usedH}h / ${totalH}h`;
      heroPackagePercent = totalH > 0 ? Math.round((hoursSummary.totalMinutes / (totalH * 60)) * 100) : 0;
    }
  }

  // Fallback: show hours this month for by_hours projects
  let heroHoursLabel: string | null = null;
  if (!heroPackageLabel) {
    const byHoursProjects = clientProjects.filter((p) => p.billingType === "hours");
    if (byHoursProjects.length > 0) {
      let totalHrs = 0;
      for (const p of byHoursProjects) {
        const hs = projectHoursMap.get(p.id);
        if (hs) totalHrs += hs.totalMinutes;
      }
      if (totalHrs > 0) {
        heroHoursLabel = formatMinutes(totalHrs);
      }
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-5xl mx-auto py-12 px-4 space-y-10">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3">
            {workspaceContact?.logoUrl && (
              <Image
                src={workspaceContact.logoUrl}
                alt={workspaceContact.name || "Workspace"}
                width={40}
                height={40}
                className="rounded-lg"
              />
            )}
            <h1 className="text-3xl font-bold tracking-tight">
              {workspaceContact?.name || client.companyName || client.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Client Portal — Secured Access
          </p>
        </div>

        {/* ─── 1. Hero Summary ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-muted-foreground">Active Projects</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{activeCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">Total Spent (YTD)</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">{fmtAmt(totalPaidIDR, totalPaidUSD)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-xs text-muted-foreground">Outstanding</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{fmtAmt(totalOutstandingIDR, totalOutstandingUSD)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-xs text-muted-foreground">
                  {heroPackageLabel ? "Package Hours" : "Hours This Month"}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {heroPackageLabel || heroHoursLabel || "—"}
              </p>
              {heroPackagePercent != null && (
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${heroPackagePercent > 90 ? "bg-red-500" : heroPackagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(heroPackagePercent, 100)}%` }}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── 2. Quick Actions Bar ─────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="h-10 px-5 rounded-lg gap-2">
            <Download className="h-4 w-4" />
            Download All Invoices
          </Button>
          <Button variant="outline" className="h-10 px-5 rounded-lg gap-2">
            <BarChart3 className="h-4 w-4" />
            Request Report
          </Button>
          <Button variant="outline" className="h-10 px-5 rounded-lg gap-2">
            <Calendar className="h-4 w-4" />
            Request Meeting
          </Button>
        </div>

        {/* ─── 3. Activity Feed (compact: 3 default, expand to 5) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed items={recentActivities} initialVisible={3} />
          </CardContent>
        </Card>

        {/* ─── 4. Projects (compact accordion) ──────────────── */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Projects ({clientProjects.length})
          </h2>
          {clientProjects.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No projects have been shared with you yet.</p>
              </CardContent>
            </Card>
          ) : (
            <ProjectAccordion
              projects={clientProjects.map((p) => ({
                ...p,
                startDate: p.startDate ? String(p.startDate) : null,
                finishDate: p.finishDate ? String(p.finishDate) : null,
              }))}
              projectTasksMap={new Map(
                [...projectTasksMap.entries()].map(([k, v]) => [
                  k,
                  v.map((t) => ({
                    ...t,
                    dueDate: t.dueDate ? String(t.dueDate) : null,
                    updatedAt: String(t.updatedAt),
                  })),
                ]),
              )}
              projectFilesMap={new Map(
                [...projectFilesMap.entries()].map(([k, v]) => [
                  k,
                  v.map((f) => ({
                    ...f,
                    createdAt: String(f.createdAt),
                  })),
                ]),
              )}
              projectTimelineMap={new Map(
                [...projectTimelineMap.entries()].map(([k, v]) => [
                  k,
                  v.map((e) => ({
                    ...e,
                    createdAt: String(e.createdAt),
                  })),
                ]),
              )}
              projectHoursMap={projectHoursMap}
              byHoursEntriesMap={new Map(
                [...byHoursEntriesMap.entries()].map(([k, v]) => [
                  k,
                  v.map((e) => ({
                    ...e,
                    startTime: e.startTime ? String(e.startTime) : null,
                    endTime: e.endTime ? String(e.endTime) : null,
                  })),
                ]),
              )}
              projectInvoicesMap={projectInvoicesMap}
              selectedPackageMap={selectedPackageMap}
              projectPackagesMap={projectPackagesMap}
              customRequests={customRequests}
              packageOrdersList={packageOrdersList.map((o) => ({
                ...o,
                createdAt: String(o.createdAt),
              }))}
              clientVisibleActionLabels={clientVisibleActionLabels}
              token={token}
              workspaceId={client.workspaceId}
              ownerWhatsAppPhone={workspaceContact?.phone}
              ownerEmail={workspaceContact?.replyToEmail || workspaceContact?.email}
              ownerName={workspaceContact?.name}
            />
          )}
        </section>

        {/* ─── 5. Invoices Section ──────────────────────────── */}
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Invoices ({clientInvoices.length})
          </h2>
          <PortalInvoices
            invoices={clientInvoices.map((inv) => ({
              id: inv.id,
              invoiceNumber: inv.invoiceNumber,
              total: String(inv.total),
              currency: inv.currency,
              status: inv.status,
              dueDate: inv.dueDate ? String(inv.dueDate) : null,
              issueDate: inv.issueDate ? String(inv.issueDate) : null,
              projectId: inv.projectId,
            }))}
            projects={clientProjects.map((p) => ({ id: p.id, name: p.name }))}
            token={token}
          />
        </section>

        {/* ─── 6. Contact team (WA / Email only) ───────────── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Hubungi Tim</CardTitle>
          </CardHeader>
          <CardContent className="max-w-lg">
            <PortalContactButtons
              phone={workspaceContact?.phone}
              email={workspaceContact?.replyToEmail || workspaceContact?.email}
              ownerName={workspaceContact?.name}
              clientName={client.name}
            />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground pt-8">
          Powered by <span className="font-medium">Cubiqlo</span> — Client
          Portal
        </p>
      </div>
    </div>
  );
}
