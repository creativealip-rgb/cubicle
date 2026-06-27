import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  clients,
  tasks,
  invoices,
  appointments,
  activityLogs,
  timeEntries,
  workspaces,
  users,
} from "@/db/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import {
  Users,
  Briefcase,
  CheckSquare,
  Receipt,
  ArrowUpRight,
  Clock,
  Calendar,
  AlertCircle,
  ListChecks,
  Plus,
  Timer,
  FileText,
  TrendingUp,
  Bell,
  FileSignature,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatMoney, formatMoneyCompact } from "@/lib/utils";
import Link from "next/link";

async function getWorkspace() {
  const [ws] = await db
    .select({ id: workspaces.id, defaultCurrency: workspaces.defaultCurrency })
    .from(workspaces)
    .where(eq(workspaces.slug, "acme-creative"))
    .limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const workspace = await getWorkspace();
  const workspaceId = workspace.id;
  const workspaceCurrency = workspace.defaultCurrency || "IDR";

  // KPI counts
  const result = await db.execute(
    sql`SELECT
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND status = 'active') as active_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId} AND status = 'active') as active_projects,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done') as due_tasks,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date IS NOT NULL AND due_date < current_date) as overdue_tasks,
      (SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status IN ('sent','viewed','overdue')) as unpaid_invoices
    `,
  );
  const counts = result.rows[0] as Record<string, number>;
  const activeClients = counts.active_clients || 0;
  const activeProjects = counts.active_projects || 0;
  const dueTasks = counts.due_tasks || 0;
  const overdueTasks = counts.overdue_tasks || 0;
  const unpaidCount = counts.unpaid_invoices || 0;

  // Attention Needed — counts surfaced as actionable summary
  const todayStr = new Date().toISOString().split("T")[0]!;
  const attention = await db
    .select({
      overdueInvoices: sql<number>`(SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status = 'overdue')`,
      tasksDueToday: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date = ${todayStr})`,
      contractsAwaiting: sql<number>`(SELECT count(*)::int FROM contracts WHERE workspace_id = ${workspaceId} AND status IN ('draft','sent','viewed'))`,
      unreadNotifications: sql<number>`(SELECT count(*)::int FROM notifications WHERE workspace_id = ${workspaceId} AND user_id = ${session?.user?.id ?? ""} AND read_at IS NULL)`,
    })
    .from(sql`(select 1) as _`)
    .limit(1);
  const att = attention[0] ?? {
    overdueInvoices: 0,
    tasksDueToday: 0,
    contractsAwaiting: 0,
    unreadNotifications: 0,
  };

  // Unpaid invoices total
  let unpaidAmount = 0;
  try {
    const result = await db.execute(
      sql`SELECT coalesce(sum(total), 0)::decimal as amt FROM invoices WHERE workspace_id = ${workspaceId} AND status IN ('sent','viewed','overdue')`,
    );
    unpaidAmount = Number((result.rows[0] as { amt: string })?.amt ?? 0);
  } catch {
    // ignore
  }

  // Cash flow forecast — unpaid invoices bucketed by due date
  const cashflowResult = await db.execute(
    sql`SELECT
      coalesce(sum(total) FILTER (WHERE due_date >= current_date AND due_date <= current_date + interval '30 days'), 0)::decimal AS d30,
      coalesce(sum(total) FILTER (WHERE due_date > current_date + interval '30 days' AND due_date <= current_date + interval '60 days'), 0)::decimal AS d60,
      coalesce(sum(total) FILTER (WHERE due_date > current_date + interval '60 days' AND due_date <= current_date + interval '90 days'), 0)::decimal AS d90,
      coalesce(sum(total) FILTER (WHERE due_date < current_date), 0)::decimal AS overdue
    FROM invoices
    WHERE workspace_id = ${workspaceId}
      AND status IN ('sent','overdue','viewed')`,
  );
  const cashflow = cashflowResult.rows[0] as {
    d30: string | number;
    d60: string | number;
    d90: string | number;
    overdue: string | number;
  };
  const cf30 = Number(cashflow.d30) || 0;
  const cf60 = Number(cashflow.d60) || 0;
  const cf90 = Number(cashflow.d90) || 0;
  const cfOverdue = Number(cashflow.overdue) || 0;
  const cfMax = Math.max(cf30, cf60, cf90, 1);

  // Client health — active clients + last activity buckets
  const clientHealthResult = await db.execute(
    sql`SELECT
      count(*) FILTER (WHERE c.status = 'active')::int AS active,
      count(*) FILTER (WHERE c.status = 'active' AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = c.id
          AND p.status = 'active'
          AND p.updated_at > current_date - interval '14 days'
      ))::int AS healthy,
      count(*) FILTER (WHERE c.status = 'active' AND NOT EXISTS (
        SELECT 1 FROM projects p
        WHERE p.client_id = c.id
          AND p.updated_at > current_date - interval '30 days'
      ))::int AS at_risk
    FROM clients c
    WHERE c.workspace_id = ${workspaceId}`,
  );
  const clientHealth = clientHealthResult.rows[0] as {
    active: number;
    healthy: number;
    at_risk: number;
  };
  const chActive = clientHealth.active || 0;
  const chHealthy = clientHealth.healthy || 0;
  const chAtRisk = clientHealth.at_risk || 0;
  const chIdle = Math.max(chActive - chHealthy - chAtRisk, 0);

  // Revenue sparkline — last 14 days, paid invoices per day (payments.paid_at)
  const sparklineResult = await db.execute(
    sql`WITH days AS (
      SELECT generate_series(current_date - interval '13 days', current_date, interval '1 day')::date AS day
    )
    SELECT d.day, coalesce(sum(p.amount), 0)::decimal AS amt
    FROM days d
    LEFT JOIN payments p ON p.paid_at = d.day
      AND p.invoice_id IN (SELECT id FROM invoices WHERE workspace_id = ${workspaceId})
    GROUP BY d.day
    ORDER BY d.day ASC`,
  );
  const sparkline: { day: string; amt: number }[] = sparklineResult.rows.map((r) => ({
    day: String((r as { day: string | Date }).day),
    amt: Number((r as { amt: string | number }).amt) || 0,
  }));

  // Active timer
  const [activeTimer] = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      startTime: timeEntries.startTime,
      userName: users.name,
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        sql`${timeEntries.startTime} is not null and ${timeEntries.endTime} is null`,
      ),
    )
    .limit(1);

  // Upcoming appointments
  const upcomingAppts = await db
    .select({
      id: appointments.id,
      title: appointments.title,
      startTime: appointments.startTime,
      attendeeName: appointments.attendeeName,
    })
    .from(appointments)
    .where(
      and(
        eq(appointments.workspaceId, workspaceId),
        eq(appointments.status, "scheduled"),
        gte(appointments.startTime, new Date()),
      ),
    )
    .orderBy(appointments.startTime)
    .limit(5);

  // Today's tasks due
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const todayTasks = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      assigneeName: users.name,
    })
    .from(tasks)
    .leftJoin(users, eq(users.id, tasks.assigneeId))
    .where(
      and(
        eq(tasks.workspaceId, workspaceId),
        gte(tasks.dueDate, todayStart.toISOString().split("T")[0]!),
        lte(tasks.dueDate, todayEnd.toISOString().split("T")[0]!),
        sql`${tasks.status} != 'done'`
      )
    )
    .orderBy(sql`case ${tasks.priority}
      when 'urgent' then 1
      when 'high' then 2
      when 'medium' then 3
      when 'low' then 4
      else 5
    end`)
    .limit(5);

  // Unpaid invoices list
  const unpaidInvoices = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      clientName: clients.name,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        eq(invoices.workspaceId, workspaceId),
        sql`${invoices.status} in ('sent', 'viewed', 'overdue')`,
      ),
    )
    .orderBy(desc(invoices.dueDate))
    .limit(5);

  // Recent activity
  const recentActivity = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entityType: activityLogs.entityType,
      createdAt: activityLogs.createdAt,
      actorName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.actorId))
    .where(eq(activityLogs.workspaceId, workspaceId))
    .orderBy(desc(activityLogs.createdAt))
    .limit(10);

  function formatRelative(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return "Baru saja";
    if (diffHrs < 24) return `${diffHrs}j lalu`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Kemarin";
    if (diffDays < 7) return `${diffDays}h lalu`;
    return new Date(date).toLocaleDateString();
  }

  const ACTION_LABELS: Record<string, string> = {
    started_timer: "Mulai Timer",
    stopped_timer: "Stop Timer",
    booked_appointment_public: "Janji Temu Publik Dibuat",
    generated_invoice_share_token: "Link Berbagi Invoice Dibuat",
    recorded_payment: "Pembayaran Dicatat",
    imported_time_to_invoice: "Catatan Waktu Diimport",
    generated_portal_token: "Token Portal Dibuat",
    created_comment: "Komentar Dibuat",
    updated_task: "Task Diperbarui",
    created_invoice: "Invoice Dibuat",
    created_client: "Klien Dibuat",
    created_project: "Project Dibuat",
    created_task: "Task Dibuat",
    updated_project: "Project Diperbarui",
    updated_invoice: "Invoice Diperbarui",
    sent_invoice: "Invoice Dikirim",
    sent_proposal: "Proposal Dikirim",
    accepted_proposal: "Proposal Diterima",
    declined_proposal: "Proposal Ditolak",
    uploaded_file: "File Diupload",
    created_appointment: "Janji Temu Dibuat",
    cancelled_appointment: "Janji Temu Dibatalkan",
  };
  const ENTITY_LABELS: Record<string, string> = {
    time_entry: "catatan waktu",
    appointment: "janji temu",
    invoice: "invoice",
    payment: "pembayaran",
    client: "klien",
    comment: "komentar",
    task: "task",
    project: "project",
    proposal: "proposal",
    file: "file",
    contract: "kontrak",
  };
  function formatAction(action: string): string {
    return ACTION_LABELS[action] ?? action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  function formatEntity(entityType: string): string {
    return ENTITY_LABELS[entityType] ?? entityType;
  }

  const kpiCards = [
    {
      label: "Klien Aktif",
      value: String(activeClients),
      change: `${activeClients} total`,
      icon: Users,
      iconBg: "bg-blue-100 text-blue-600",
      accentBorder: "border-l-blue-500",
      href: "/app/clients",
    },
    {
      label: "Project Aktif",
      value: String(activeProjects),
      change: `${activeProjects} berjalan`,
      icon: Briefcase,
      iconBg: "bg-emerald-100 text-emerald-600",
      accentBorder: "border-l-emerald-500",
      href: "/app/projects",
    },
    {
      label: "Task Jatuh Tempo",
      value: String(dueTasks),
      change: `${overdueTasks} terlambat`,
      icon: CheckSquare,
      iconBg: "bg-amber-100 text-amber-600",
      accentBorder: "border-l-amber-500",
      href: "/app/tasks",
    },
    {
      label: "Invoice Belum Dibayar",
      value: formatMoneyCompact(unpaidAmount, workspaceCurrency),
      change: `${unpaidCount} belum dibayar`,
      icon: Receipt,
      iconBg: "bg-red-100 text-red-600",
      accentBorder: "border-l-red-500",
      href: "/app/invoices",
    },
  ];

  // Greeting + quick action chips
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Selamat pagi" : hour < 18 ? "Selamat siang" : "Selamat malam";
  const todayLong = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const firstName = (session?.user?.name || "User").split(" ")[0];

  // Sparkline geometry
  const sparkW = 240;
  const sparkH = 56;
  const maxAmt = Math.max(...sparkline.map((d) => d.amt), 1);
  const sparkPoints = sparkline.map((d, i) => {
    const x = (i / Math.max(sparkline.length - 1, 1)) * sparkW;
    const y = sparkH - (d.amt / maxAmt) * (sparkH - 6) - 3;
    return `${x},${y}`;
  });
  const sparkPath = sparkPoints.length > 0 ? `M ${sparkPoints.join(" L ")}` : "";
  const sparkArea =
    sparkPoints.length > 0
      ? `M 0,${sparkH} L ${sparkPoints.join(" L ")} L ${sparkW},${sparkH} Z`
      : "";
  const sparkTotal = sparkline.reduce((s, d) => s + d.amt, 0);
  const sparkPrevTotal = sparkline.slice(0, 7).reduce((s, d) => s + d.amt, 0);
  const sparkTrend = sparkPrevTotal > 0 ? ((sparkTotal - sparkPrevTotal) / sparkPrevTotal) * 100 : 0;

  const quickActions = [
    { label: "Task baru", icon: CheckSquare, href: "/app/tasks" },
    { label: "Invoice baru", icon: FileText, href: "/app/invoices" },
    { label: "Mulai timer", icon: Timer, href: "/app/time" },
    { label: "Tambah klien", icon: Plus, href: "/app/clients" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {greeting}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {todayLong} · {activeProjects} project aktif · {dueTasks} task jatuh tempo
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickActions.map((qa) => {
            const Icon = qa.icon;
            return (
              <Button
                key={qa.label}
                asChild
                variant="outline"
                size="sm"
                className="gap-1.5 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm"
              >
                <Link href={qa.href}>
                  <Icon className="h-3.5 w-3.5" />
                  {qa.label}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Attention Needed — only shown if any count > 0 */}
      {(att.overdueInvoices > 0 ||
        att.tasksDueToday > 0 ||
        att.contractsAwaiting > 0 ||
        att.unreadNotifications > 0) && (
        <div className="relative overflow-hidden rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 p-5 shadow-sm">
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-amber-200/30 blur-2xl" />
          <div className="relative flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-200 text-amber-800">
                <AlertCircle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-semibold tracking-tight text-amber-900">
                Perlu perhatian
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {att.overdueInvoices > 0 && (
                <Link
                  href="/app/invoices?status=overdue"
                  className="group flex flex-col gap-1.5 rounded-lg border border-rose-200/60 bg-white/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-1.5 text-rose-700">
                    <Receipt className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Invoice terlambat</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-rose-700">
                      {att.overdueInvoices}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-rose-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              )}
              {att.tasksDueToday > 0 && (
                <Link
                  href="/app/tasks?filter=today"
                  className="group flex flex-col gap-1.5 rounded-lg border border-amber-200/60 bg-white/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-1.5 text-amber-700">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Task hari ini</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-amber-700">
                      {att.tasksDueToday}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-amber-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              )}
              {att.contractsAwaiting > 0 && (
                <Link
                  href="/app/contracts"
                  className="group flex flex-col gap-1.5 rounded-lg border border-blue-200/60 bg-white/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <FileSignature className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Kontrak menunggu</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-blue-700">
                      {att.contractsAwaiting}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-blue-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              )}
              {att.unreadNotifications > 0 && (
                <Link
                  href="/app/dashboard"
                  className="group flex flex-col gap-1.5 rounded-lg border border-purple-200/60 bg-white/80 p-3 transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-1.5 text-purple-700">
                    <Bell className="h-3.5 w-3.5" />
                    <span className="text-xs font-medium">Notifikasi belum dibaca</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-2xl font-bold text-purple-700">
                      {att.unreadNotifications}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-purple-400 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revenue sparkline — hero bar */}
      <Card className="bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Pendapatan (14 hari terakhir)</p>
            <p className="text-3xl font-bold tracking-tight">
              {formatMoneyCompact(sparkTotal, workspaceCurrency)}
            </p>
            <p
              className={`text-xs font-medium ${
                sparkTrend >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              <TrendingUp
                className={`mr-1 inline h-3 w-3 ${
                  sparkTrend < 0 ? "rotate-180" : ""
                }`}
              />
              {sparkTrend >= 0 ? "+" : ""}
              {sparkTrend.toFixed(0)}% vs 7 hari sebelumnya
            </p>
          </div>
          <svg
            viewBox={`0 0 ${sparkW} ${sparkH}`}
            className="h-16 w-full max-w-xs sm:max-w-sm"
            preserveAspectRatio="none"
            aria-label="Revenue trend last 14 days"
          >
            <defs>
              <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={sparkArea} fill="url(#sparkFill)" />
            <path
              d={sparkPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href} className="group">
              <Card className={`relative cursor-pointer border-l-4 ${kpi.accentBorder} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1.5">
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="text-2xl font-bold tracking-tight">
                        {kpi.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{kpi.change}</p>
                    </div>
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${kpi.iconBg}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <ArrowUpRight className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Client Health + Cash Flow Forecast */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Client health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold">
              <span>Kesehatan klien</span>
              <Link
                href="/app/clients"
                className="text-xs font-normal text-muted-foreground hover:text-slate-950"
              >
                Lihat semua →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
              {chActive > 0 && chHealthy > 0 && (
                <div
                  className="bg-emerald-500 transition-all"
                  style={{ width: `${(chHealthy / chActive) * 100}%` }}
                  title={`${chHealthy} healthy`}
                />
              )}
              {chActive > 0 && chIdle > 0 && (
                <div
                  className="bg-amber-400 transition-all"
                  style={{ width: `${(chIdle / chActive) * 100}%` }}
                  title={`${chIdle} idle`}
                />
              )}
              {chActive > 0 && chAtRisk > 0 && (
                <div
                  className="bg-red-500 transition-all"
                  style={{ width: `${(chAtRisk / chActive) * 100}%` }}
                  title={`${chAtRisk} at risk`}
                />
              )}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                <p className="text-2xl font-bold text-emerald-700">{chHealthy}</p>
                <p className="text-xs font-medium text-emerald-700/80">Sehat</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50/50 p-3">
                <p className="text-2xl font-bold text-amber-700">{chIdle}</p>
                <p className="text-xs font-medium text-amber-700/80">Diam</p>
              </div>
              <div className="rounded-lg border border-red-100 bg-red-50/50 p-3">
                <p className="text-2xl font-bold text-red-700">{chAtRisk}</p>
                <p className="text-xs font-medium text-red-700/80">Berisiko</p>
              </div>
            </div>
            {chAtRisk > 0 && (
              <p className="text-xs text-muted-foreground">
                {chAtRisk} klien tidak ada aktivitas project 30+ hari terakhir.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cash flow forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold">
              <span>Proyeksi arus kas</span>
              <Link
                href="/app/reports"
                className="text-xs font-normal text-muted-foreground hover:text-slate-950"
              >
                Laporan →
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "30 hari ke depan", amt: cf30, color: "bg-blue-500" },
              { label: "31–60 hari", amt: cf60, color: "bg-blue-400" },
              { label: "61–90 hari", amt: cf90, color: "bg-blue-300" },
            ].map((bucket) => (
              <div key={bucket.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{bucket.label}</span>
                  <span className="font-semibold tabular-nums text-slate-950">
                    {formatMoney(bucket.amt, workspaceCurrency)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${bucket.color} transition-all`}
                    style={{ width: `${(bucket.amt / cfMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {cfOverdue > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm">
                <span className="font-medium text-red-700">Sudah terlambat</span>
                <span className="font-semibold tabular-nums text-red-700">
                  {formatMoney(cfOverdue, workspaceCurrency)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Aktivitas Terbaru
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link href="/app/tasks">
                Lihat task
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada aktivitas</p>
            )}
            {recentActivity.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatAction(item.action)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatEntity(item.entityType)}
                      {item.actorName && ` oleh ${item.actorName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                {i < recentActivity.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-4">
          {/* Active Timer + Upcoming — merged */}
          <Card>
            <CardContent className="divide-y divide-slate-100 p-0">
              {/* Timer */}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Timer Aktif</span>
                </div>
                {activeTimer ? (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activeTimer.description || "Tanpa judul"}</p>
                      <p className="text-xs text-muted-foreground">{activeTimer.userName}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Tidak ada timer aktif</p>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                      <Link href="/app/time">Mulai</Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Upcoming */}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Jadwal Mendatang</span>
                </div>
                {upcomingAppts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada jadwal</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppts.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <p className="min-w-0 truncate text-sm">{apt.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(apt.startTime).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Receipt className="h-3.5 w-3.5 text-muted-foreground" />
                Invoice Belum Dibayar
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" asChild>
                <Link href="/app/invoices">Lihat semua</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {unpaidInvoices.length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">Tidak ada invoice belum dibayar</p>
              )}
              {unpaidInvoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">{inv.clientName}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {inv.status === "overdue" && <AlertCircle className="h-3 w-3 text-red-500" />}
                    <span className="text-sm font-semibold tabular-nums">{formatMoney(inv.total, inv.currency || workspaceCurrency)}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                Task Hari Ini
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" asChild>
                <Link href="/app/tasks">Lihat semua</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {todayTasks.length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">Tidak ada task hari ini</p>
              )}
              {todayTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    {task.assigneeName && <p className="text-xs text-muted-foreground">{task.assigneeName}</p>}
                  </div>
                  <Badge
                    variant={task.priority === "urgent" ? "destructive" : task.priority === "high" ? "default" : "secondary"}
                    className="shrink-0 text-xs"
                  >
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
