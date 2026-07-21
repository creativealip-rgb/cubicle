import { requireAppSession } from "@/lib/app-auth";
import { getCurrentLang, getLocale, createT } from "@/lib/i18n";
import { db } from "@/db";
import {
  appointments,
  personalNotes,
  timeEntries,
  users,
} from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";
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
  Plus,
  FileText,
  TrendingUp,
  Bell,
  FileSignature,
  ArrowRight,
  NotebookPen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatMoneyCompact } from "@/lib/utils";
import Link from "next/link";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { DashboardGreeting } from "@/components/dashboard-greeting";
import { DashboardOnboarding } from "@/components/dashboard-onboarding";

async function getWorkspace() {
  return getWorkspaceFullForCurrentUser();
}

export default async function DashboardPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await requireAppSession("/app/dashboard");
  requireUser(session.user);
  const workspace = await getWorkspace();
  const workspaceId = workspace.id;
  const workspaceCurrency = workspace.defaultCurrency || "IDR";

  const result = await db.execute(
    sql`SELECT
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND status = 'active') as active_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId} AND status = 'active') as active_projects,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date IS NOT NULL AND due_date <= current_date) as due_tasks,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date IS NOT NULL AND due_date < current_date) as overdue_tasks,
      (SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status IN ('sent','viewed','overdue') AND due_date IS NOT NULL AND due_date <= current_date) as due_invoices,
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId}) as total_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId}) as total_projects,
      (SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId}) as total_invoices,
      (SELECT count(*)::int FROM time_entries WHERE workspace_id = ${workspaceId}) as total_time_entries,
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND portal_enabled = true AND portal_token_hash IS NOT NULL AND portal_token_revoked_at IS NULL) as portal_active
    `,
  );
  const counts = result.rows[0] as Record<string, number>;
  const activeClients = counts.active_clients || 0;
  const activeProjects = counts.active_projects || 0;
  const dueTasks = counts.due_tasks || 0;
  const overdueTasks = counts.overdue_tasks || 0;
  const dueInvoices = counts.due_invoices || 0;
  const totalClients = counts.total_clients || 0;
  const totalProjects = counts.total_projects || 0;
  const totalInvoices = counts.total_invoices || 0;
  const totalTimeEntries = counts.total_time_entries || 0;
  const portalActive = counts.portal_active || 0;

  const todayStr = new Date().toISOString().split("T")[0]!;
  const attention = await db
    .select({
      overdueInvoices: sql<number>`(SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status NOT IN ('paid','cancelled','archived') AND due_date < current_date)`,
      tasksDueToday: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date <= ${todayStr})`,
      contractsAwaiting: sql<number>`(SELECT count(*)::int FROM contracts WHERE workspace_id = ${workspaceId} AND status IN ('draft','sent','viewed'))`,
      clientApprovals: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status = 'review' AND client_visible = true)`,
    })
    .from(sql`(select 1) as _`)
    .limit(1);
  const att = attention[0] ?? {
    overdueInvoices: 0,
    tasksDueToday: 0,
    contractsAwaiting: 0,
    clientApprovals: 0,
  };

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const upcomingReminders = await db
    .select({
      id: personalNotes.id,
      title: personalNotes.title,
      dueDate: personalNotes.dueDate,
      recurrenceRule: personalNotes.recurrenceRule,
    })
    .from(personalNotes)
    .where(
      and(
        eq(personalNotes.workspaceId, workspaceId),
        eq(personalNotes.userId, session?.user?.id ?? ""),
        eq(personalNotes.status, "open"),
        sql`${personalNotes.dueDate} IS NOT NULL`,
        sql`${personalNotes.dueDate} <= ${in7d.toISOString()}`,
        sql`${personalNotes.dueDate} >= ${now.toISOString()}`,
        sql`${personalNotes.title} NOT LIKE ${"[journal]%"}`,
        sql`${personalNotes.title} NOT LIKE ${"[site]%"}`,
      ),
    )
    .orderBy(personalNotes.dueDate)
    .limit(5);

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

  // Revenue last 30 days only (payments)
  const rev30Result = await db.execute(
    sql`SELECT i.currency, coalesce(sum(p.amount), 0)::decimal AS total
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    WHERE i.workspace_id = ${workspaceId}
      AND p.paid_at >= current_date - interval '30 days'
    GROUP BY i.currency`,
  );
  const rev30ByCurrency: Record<string, number> = {};
  for (const row of rev30Result.rows as Array<{ currency: string; total: string }>) {
    rev30ByCurrency[row.currency] = Number(row.total) || 0;
  }
  const rev30 = rev30ByCurrency[workspaceCurrency] ?? rev30ByCurrency["IDR"] ?? 0;
  const rev30usd = rev30ByCurrency["USD"] ?? 0;

  // Sparkline 30 days
  const sparklineResult = await db.execute(
    sql`WITH days AS (
      SELECT generate_series(current_date - interval '29 days', current_date, interval '1 day')::date AS day
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

  // Client revenue pie (paid last 30d, top 5)
  const clientPieResult = await db.execute(
    sql`SELECT c.name AS client_name, i.currency, coalesce(sum(p.amount), 0)::decimal AS total
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN clients c ON c.id = i.client_id
    WHERE i.workspace_id = ${workspaceId}
      AND p.paid_at >= current_date - interval '30 days'
      AND i.currency = ${workspaceCurrency}
    GROUP BY c.name, i.currency
    ORDER BY total DESC
    LIMIT 5`,
  );
  const clientPie = (clientPieResult.rows as Array<{ client_name: string; total: string }>).map((r) => ({
    name: r.client_name,
    total: Number(r.total) || 0,
  }));
  const pieTotal = Math.max(clientPie.reduce((s, c) => s + c.total, 0), 1);

  const [activeTimer] = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      startTime: timeEntries.startTime,
      pausedAt: timeEntries.pausedAt,
      userName: users.name,
    })
    .from(timeEntries)
    .leftJoin(users, eq(users.id, timeEntries.userId))
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        sql`${timeEntries.startTime} is not null and ${timeEntries.endTime} is null and ${timeEntries.manualMinutes} is null`,
      ),
    )
    .limit(1);

  // Recent activity slim
  const recentActivity = await db.execute(
    sql`SELECT al.id, al.action, al.entity_type as "entityType", al.created_at as "createdAt", u.name as "actorName"
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.workspace_id = ${workspaceId}
    ORDER BY al.created_at DESC
    LIMIT 8`,
  );
  const activityRows = recentActivity.rows as Array<{
    id: string;
    action: string;
    entityType: string;
    createdAt: Date | string;
    actorName: string | null;
  }>;

  function formatRelative(date: Date | string): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHrs < 1) return t("Baru saja", "Just now");
    if (diffHrs < 24) return lang === "en" ? `${diffHrs}h ago` : `${diffHrs}j lalu`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return t("Kemarin", "Yesterday");
    if (diffDays < 7) return lang === "en" ? `${diffDays}d ago` : `${diffDays}h lalu`;
    return new Date(date).toLocaleDateString(locale);
  }

  function formatAction(action: string): string {
    return action.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const kpiCards = [
    {
      label: t("Klien Aktif", "Active Clients"),
      value: String(activeClients),
      change: `${activeClients} ${t("total", "total")}`,
      icon: Users,
      iconBg: "bg-slate-100 text-slate-600",
      accentBorder: "border-l-slate-300",
      href: "/app/clients",
    },
    {
      label: t("Proyek Aktif", "Active Projects"),
      value: String(activeProjects),
      change: `${activeProjects} ${t("berjalan", "running")}`,
      icon: Briefcase,
      iconBg: "bg-slate-100 text-slate-600",
      accentBorder: "border-l-slate-300",
      href: "/app/projects",
    },
    {
      label: t("Tugas Jatuh Tempo", "Due Tasks"),
      value: String(dueTasks),
      change: `${overdueTasks} ${t("terlambat", "overdue")}`,
      icon: CheckSquare,
      iconBg: "bg-amber-100 text-amber-600",
      accentBorder: "border-l-amber-500",
      href: "/app/tasks",
    },
    {
      label: t("Invoice Jatuh Tempo", "Due Invoices"),
      value: String(dueInvoices),
      change: `${att.overdueInvoices} ${t("terlambat", "overdue")}`,
      icon: Receipt,
      iconBg: "bg-rose-100 text-rose-600",
      accentBorder: "border-l-rose-500",
      href: "/app/invoices?status=overdue",
    },
  ];

  const firstName = (session?.user?.name || "User").split(" ")[0];

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

  // Simple pie slices for SVG
  const pieColors = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];
  let pieCursor = 0;
  const pieSlices = clientPie.map((c, i) => {
    const frac = c.total / pieTotal;
    const start = pieCursor;
    const end = pieCursor + frac;
    pieCursor = end;
    const a0 = start * Math.PI * 2 - Math.PI / 2;
    const a1 = end * Math.PI * 2 - Math.PI / 2;
    const r = 40;
    const x0 = 50 + r * Math.cos(a0);
    const y0 = 50 + r * Math.sin(a0);
    const x1 = 50 + r * Math.cos(a1);
    const y1 = 50 + r * Math.sin(a1);
    const large = frac > 0.5 ? 1 : 0;
    const d = `M 50 50 L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
    return { d, color: pieColors[i % pieColors.length], name: c.name, total: c.total };
  });

  // Reminder items unified
  type ReminderItem = {
    key: string;
    label: string;
    href: string;
    tone: "rose" | "amber" | "blue" | "purple" | "slate";
    count?: number;
    meta?: string;
  };
  const reminderItems: ReminderItem[] = [];
  if (att.overdueInvoices > 0) {
    reminderItems.push({
      key: "inv-overdue",
      label: t("Invoice jatuh tempo", "Invoice due"),
      href: "/app/invoices?status=overdue",
      tone: "rose",
      count: att.overdueInvoices,
    });
  }
  if (att.tasksDueToday > 0) {
    reminderItems.push({
      key: "task-today",
      label: t("Tugas perlu dikerjakan", "Tasks due"),
      href: "/app/tasks?filter=today",
      tone: "amber",
      count: att.tasksDueToday,
    });
  }
  if (att.clientApprovals > 0) {
    reminderItems.push({
      key: "approval",
      label: t("Approval task client", "Client task approval"),
      href: "/app/tasks?status=review",
      tone: "purple",
      count: att.clientApprovals,
    });
  }
  if (att.contractsAwaiting > 0) {
    reminderItems.push({
      key: "contract",
      label: t("Kontrak menunggu", "Awaiting contracts"),
      href: "/app/contracts",
      tone: "blue",
      count: att.contractsAwaiting,
    });
  }
  for (const apt of upcomingAppts.slice(0, 3)) {
    reminderItems.push({
      key: `apt-${apt.id}`,
      label: apt.title,
      href: "/app/calendar",
      tone: "slate",
      meta: new Date(apt.startTime).toLocaleString(locale, {
        weekday: "short",
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    });
  }
  for (const r of upcomingReminders) {
    reminderItems.push({
      key: `note-${r.id}`,
      label: r.title,
      href: "/app/personal",
      tone: "blue",
      meta: r.dueDate
        ? new Date(r.dueDate).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        : undefined,
    });
  }

  const toneClass: Record<ReminderItem["tone"], string> = {
    rose: "border-rose-200 bg-rose-50 text-rose-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
    purple: "border-purple-200 bg-purple-50 text-purple-800",
    slate: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-end sm:justify-between">
        <DashboardGreeting
          firstName={firstName}
          lang={lang}
          activeProjects={activeProjects}
          dueTasks={dueTasks}
        />
      </div>

      <DashboardOnboarding
        lang={lang}
        steps={[
          { key: "client", done: totalClients > 0, href: "/app/clients" },
          { key: "project", done: totalProjects > 0, href: "/app/projects" },
          { key: "time", done: totalTimeEntries > 0, href: "/app/time" },
          { key: "invoice", done: totalInvoices > 0, href: "/app/invoices" },
          { key: "portal", done: portalActive > 0, href: "/app/clients" },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("Reminder", "Reminder")}
        </h2>
        <Card>
          <CardContent className="p-4 space-y-2">
            {reminderItems.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Bell className="h-4 w-4" />
                {t("Tidak ada reminder", "No reminders")}
              </div>
            ) : (
              reminderItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm transition-all hover:-translate-y-0.5 hover:shadow-sm ${toneClass[item.tone]}`}
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.count != null && (
                      <Badge variant="secondary" className="text-[10px]">
                        {item.count}
                      </Badge>
                    )}
                    {item.meta && (
                      <span className="text-[11px] opacity-80">{item.meta}</span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 opacity-60" />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {t("Kerja", "Work")}
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpiCards.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} href={kpi.href} className="group">
                <Card
                  className={`relative cursor-pointer border-l-4 ${kpi.accentBorder} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1.5">
                        <p className="text-sm text-muted-foreground">{kpi.label}</p>
                        <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
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
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              {t("Aktivitas Terbaru", "Recent Activity")}
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link href="/app/tasks">
                {t("Lihat tugas", "View tasks")}
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {activityRows.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t("Belum ada aktivitas", "No activity yet")}
              </p>
            )}
            {activityRows.slice(0, 5).map((item, i) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">{formatAction(item.action)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {item.entityType}
                      {item.actorName && ` ${t("oleh", "by")} ${item.actorName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                {i < Math.min(activityRows.length, 5) - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Active timer only */}
          <Card>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground">
                  {t("Timer Aktif", "Active Timer")}
                </span>
              </div>
              {activeTimer ? (
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {activeTimer.description || t("Tanpa judul", "Untitled")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activeTimer.userName}
                      {activeTimer.pausedAt ? ` · ${t("Dijeda", "Paused")}` : ""}
                    </p>
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-1 text-center">
                  <Clock className="h-6 w-6 text-slate-300" />
                  <p className="text-sm text-muted-foreground">
                    {t("Tidak ada timer aktif", "No active timer")}
                  </p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                    <Link href="/app/time">{t("Mulai", "Start")}</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Finance sidebar: 30d revenue only */}
          <Card className="bg-gradient-to-b from-slate-50 to-white">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-sm font-semibold">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  {t("Keuangan", "Finance")}
                </span>
                <Link href="/app/reports" className="text-xs font-normal text-muted-foreground hover:text-slate-950">
                  {t("Detail →", "Details →")}
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t("Pendapatan 30 hari terakhir", "Revenue last 30 days")}
                </p>
                <p className="text-2xl font-bold tracking-tight">
                  {formatMoneyCompact(sparkTotal || rev30, workspaceCurrency)}
                </p>
                {rev30usd > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    + {formatMoneyCompact(rev30usd, "USD")}
                  </p>
                )}
              </div>
              <svg
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                className="h-14 w-full"
                preserveAspectRatio="none"
                aria-label="Revenue trend last 30 days"
              >
                <defs>
                  <linearGradient id="sparkFill30" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d={sparkArea} fill="url(#sparkFill30)" />
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>

              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  {t("Pendapatan per klien", "Revenue by client")}
                </p>
                {clientPie.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Belum ada pembayaran 30 hari", "No payments in 30 days")}
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 100 100" className="h-20 w-20 shrink-0">
                      {pieSlices.map((s) => (
                        <path key={s.name} d={s.d} fill={s.color} />
                      ))}
                      <circle cx="50" cy="50" r="18" fill="white" />
                    </svg>
                    <div className="min-w-0 space-y-1">
                      {clientPie.map((c, i) => (
                        <div key={c.name} className="flex items-center gap-2 text-[11px]">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: pieColors[i % pieColors.length] }}
                          />
                          <span className="truncate">{c.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
