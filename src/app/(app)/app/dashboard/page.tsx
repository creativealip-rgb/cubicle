import { requireAppSession } from "@/lib/app-auth";
import { getCurrentLang, getLocale, createT } from "@/lib/i18n";
import { db } from "@/db";
import {
  clients,
  tasks,
  invoices,
  appointments,
  activityLogs,
  timeEntries,
  users,
  personalNotes,
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
  TrendingDown,
  Bell,
  Wallet,
  FileSignature,
  ArrowRight,
  NotebookPen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatMoney, formatMoneyCompact } from "@/lib/utils";
import Link from "next/link";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { taskPriorityLabel } from "@/lib/status-badge";
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
  const _user = requireUser(session.user);
  const workspace = await getWorkspace();
  const workspaceId = workspace.id;
  const workspaceCurrency = workspace.defaultCurrency || "IDR";

  // KPI counts
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
      (SELECT count(*)::int FROM time_entries WHERE workspace_id = ${workspaceId}) as total_time_entries
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

  // Attention Needed — counts surfaced as actionable summary
  const todayStr = new Date().toISOString().split("T")[0]!;
  const attention = await db
    .select({
      overdueInvoices: sql<number>`(SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status NOT IN ('paid','cancelled') AND due_date < current_date)`,
      tasksDueToday: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date <= ${todayStr})`,
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

  // Personal note reminders — due within next 7 days, owner only
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
      ),
    )
    .orderBy(personalNotes.dueDate)
    .limit(5);

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

  // Cash flow forecast — unpaid invoices bucketed by due date, grouped by currency
  const cashflowResult = await db.execute(
    sql`SELECT
      currency,
      coalesce(sum(total) FILTER (WHERE due_date >= current_date AND due_date <= current_date + interval '30 days'), 0)::decimal AS d30,
      coalesce(sum(total) FILTER (WHERE due_date > current_date + interval '30 days' AND due_date <= current_date + interval '60 days'), 0)::decimal AS d60,
      coalesce(sum(total) FILTER (WHERE due_date > current_date + interval '60 days' AND due_date <= current_date + interval '90 days'), 0)::decimal AS d90,
      coalesce(sum(total) FILTER (WHERE due_date < current_date), 0)::decimal AS overdue
    FROM invoices
    WHERE workspace_id = ${workspaceId}
      AND status NOT IN ('paid','cancelled')
    GROUP BY currency`,
  );
  // Primary currency (workspace default) for main display
  const cfByIDR: Record<string, number> = { d30: 0, d60: 0, d90: 0, overdue: 0 };
  const cfByUSD: Record<string, number> = { d30: 0, d60: 0, d90: 0, overdue: 0 };
  for (const row of cashflowResult.rows as Array<{ currency: string; d30: string; d60: string; d90: string; overdue: string }>) {
    const target = row.currency === "USD" ? cfByUSD : cfByIDR;
    target.d30 += Number(row.d30) || 0;
    target.d60 += Number(row.d60) || 0;
    target.d90 += Number(row.d90) || 0;
    target.overdue += Number(row.overdue) || 0;
  }
  const cf30 = cfByIDR.d30;
  const cf60 = cfByIDR.d60;
  const cf90 = cfByIDR.d90;
  const cfOverdue = cfByIDR.overdue;
  const cf30usd = cfByUSD.d30;
  const cf60usd = cfByUSD.d60;
  const cf90usd = cfByUSD.d90;
  const cfOverdueUsd = cfByUSD.overdue;
  const cfMax = Math.max(cf30, cf60, cf90, 1);
  const hasUSD = cf30usd > 0 || cf60usd > 0 || cf90usd > 0 || cfOverdueUsd > 0;

  // Revenue sparkline — last 90 days, paid invoices per day (payments.paid_at)
  const sparklineResult = await db.execute(
    sql`WITH days AS (
      SELECT generate_series(current_date - interval '89 days', current_date, interval '1 day')::date AS day
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

  // Expense summary — current month total, grouped by currency
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const expenseMonthResult = await db.execute(
    sql`SELECT currency, coalesce(sum(amount), 0)::decimal as total FROM expenses WHERE workspace_id = ${workspaceId} AND date >= ${monthStart} GROUP BY currency`,
  );
  const expMonthByCurrency: Record<string, number> = {};
  for (const row of expenseMonthResult.rows as Array<{ currency: string; total: string }>) {
    expMonthByCurrency[row.currency] = Number(row.total) || 0;
  }
  const expenseMonth = expMonthByCurrency["IDR"] ?? 0;
  const expenseMonthUSD = expMonthByCurrency["USD"] ?? 0;

  // YTD totals — grouped by currency
  const ytdStart = `${now.getFullYear()}-01-01`;
  const ytdRevenueResult = await db.execute(
    sql`SELECT i.currency, coalesce(sum(p.amount), 0)::decimal as total FROM payments p JOIN invoices i ON i.id = p.invoice_id WHERE i.workspace_id = ${workspaceId} AND p.paid_at >= ${ytdStart} GROUP BY i.currency`,
  );
  const ytdRevByCurrency: Record<string, number> = {};
  for (const row of ytdRevenueResult.rows as Array<{ currency: string; total: string }>) {
    ytdRevByCurrency[row.currency] = Number(row.total) || 0;
  }
  const ytdRevenue = ytdRevByCurrency["IDR"] ?? 0;
  const ytdRevenueUSD = ytdRevByCurrency["USD"] ?? 0;

  const ytdExpenseResult = await db.execute(
    sql`SELECT currency, coalesce(sum(amount), 0)::decimal as total FROM expenses WHERE workspace_id = ${workspaceId} AND date >= ${ytdStart} GROUP BY currency`,
  );
  const ytdExpByCurrency: Record<string, number> = {};
  for (const row of ytdExpenseResult.rows as Array<{ currency: string; total: string }>) {
    ytdExpByCurrency[row.currency] = Number(row.total) || 0;
  }
  const ytdExpense = ytdExpByCurrency["IDR"] ?? 0;
  const ytdExpenseUSD = ytdExpByCurrency["USD"] ?? 0;
  const ytdNet = ytdRevenue - ytdExpense;
  const ytdNetUSD = ytdRevenueUSD - ytdExpenseUSD;

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
    if (diffHrs < 1) return t("Baru saja", "Just now");
    if (diffHrs < 24) return lang === "en" ? `${diffHrs}h ago` : `${diffHrs}j lalu`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return t("Kemarin", "Yesterday");
    if (diffDays < 7) return lang === "en" ? `${diffDays}d ago` : `${diffDays}h lalu`;
    return new Date(date).toLocaleDateString(locale);
  }

  const ACTION_LABELS: Record<string, string> = {
    started_timer: "Mulai Timer",
    stopped_timer: "Hentikan Timer",
    booked_appointment_public: "Janji Temu Publik Dibuat",
    generated_invoice_share_token: "Link Berbagi Invoice Dibuat",
    recorded_payment: "Pembayaran Dicatat",
    imported_time_to_invoice: "Catatan Waktu Diimport",
    generated_portal_token: "Token Portal Dibuat",
    created_comment: "Komentar Dibuat",
    updated_task: "Tugas Diperbarui",
    created_invoice: "Invoice Dibuat",
    created_client: "Klien Dibuat",
    created_project: "Proyek Dibuat",
    created_task: "Tugas Dibuat",
    updated_project: "Proyek Diperbarui",
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
    task: "tugas",
    project: "proyek",
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

  // Greeting + quick action chips
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
    { label: t("Tugas baru", "New task"), icon: CheckSquare, href: "/app/tasks" },
    { label: t("Invoice baru", "New invoice"), icon: FileText, href: "/app/invoices" },
    { label: t("Mulai timer", "Start timer"), icon: Timer, href: "/app/time" },
    { label: t("Tambah klien", "Add client"), icon: Plus, href: "/app/clients" },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting + quick actions */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <DashboardGreeting firstName={firstName} lang={lang} activeProjects={activeProjects} dueTasks={dueTasks} />
        <div className="flex flex-wrap items-center gap-2">
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

      <DashboardOnboarding
        lang={lang}
        steps={[
          { key: "client", done: totalClients > 0, href: "/app/clients" },
          { key: "project", done: totalProjects > 0, href: "/app/projects" },
          { key: "time", done: totalTimeEntries > 0, href: "/app/time" },
          { key: "invoice", done: totalInvoices > 0, href: "/app/invoices" },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("Reminder", "Reminder")}</h2>
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
                {t("Perlu perhatian", "Needs attention")}
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
                    <span className="text-xs font-medium">{t("Invoice terlambat", "Overdue invoices")}</span>
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
                    <span className="text-xs font-medium">{t("Task hari ini", "Today tasks")}</span>
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
                    <span className="text-xs font-medium">{t("Kontrak menunggu", "Awaiting contracts")}</span>
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
                    <span className="text-xs font-medium">{t("Notifikasi belum dibaca", "Unread notifications")}</span>
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

      {/* Personal note reminders — upcoming 7 days */}
      {upcomingReminders.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <NotebookPen className="h-4 w-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">
              {t("Reminder Personal", "Personal Reminders")}
            </h3>
            <Badge variant="secondary" className="ml-auto text-xs">{upcomingReminders.length}</Badge>
          </div>
          <div className="space-y-2">
            {upcomingReminders.map((r) => (
              <Link
                key={r.id}
                href="/app/personal"
                className="flex items-center justify-between rounded-lg bg-white/70 px-3 py-2 text-sm hover:bg-white transition-colors"
              >
                <span className="truncate font-medium">{r.title}</span>
                <div className="flex items-center gap-2 shrink-0">
                  {r.recurrenceRule && r.recurrenceRule !== "none" && (
                    <Badge variant="outline" className="text-[10px]">{r.recurrenceRule}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {r.dueDate ? new Date(r.dueDate).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" }) : ""}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("Kerja", "Work")}</h2>

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

      </section>


      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
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
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">{t("Belum ada aktivitas", "No activity yet")}</p>
            )}
            {recentActivity.slice(0, 5).map((item, i) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-sm font-medium">
                      {formatAction(item.action)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatEntity(item.entityType)}
                      {item.actorName && ` ${t("oleh", "by")} ${item.actorName}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelative(item.createdAt)}
                  </span>
                </div>
                {i < Math.min(recentActivity.length, 5) - 1 && <Separator className="mt-3" />}
              </div>
            ))}
            {recentActivity.length > 5 && (
              <p className="pt-1 text-center text-xs text-muted-foreground">
                {t("Menampilkan 5 aktivitas terakhir", "Showing latest 5 activities")}
              </p>
            )}
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
                  <span className="text-xs font-medium text-muted-foreground">{t("Timer Aktif", "Active Timer")}</span>
                </div>
                {activeTimer ? (
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{activeTimer.description || t("Tanpa judul", "Untitled")}</p>
                      <p className="text-xs text-muted-foreground">{activeTimer.userName}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                      <Clock className="h-4 w-4 text-emerald-600 animate-pulse" />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-1 text-center">
                    <Clock className="h-6 w-6 text-slate-300" />
                    <p className="text-sm text-muted-foreground">{t("Tidak ada timer aktif", "No active timer")}</p>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                      <Link href="/app/time">{t("Mulai", "Start")}</Link>
                    </Button>
                  </div>
                )}
              </div>

              {/* Upcoming */}
              <div className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">{t("Jadwal Mendatang", "Upcoming Schedule")}</span>
                </div>
                {upcomingAppts.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-3 text-center">
                    <Calendar className="h-6 w-6 text-slate-300" />
                    <p className="text-sm text-muted-foreground">{t("Tidak ada jadwal", "No schedule")}</p>
                    <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                      <Link href="/app/calendar">{t("Buat jadwal", "Add schedule")}</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {upcomingAppts.slice(0, 3).map((apt) => (
                      <div key={apt.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        <p className="min-w-0 truncate text-sm">{apt.title}</p>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Date(apt.startTime).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
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
                <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
                {t("Tugas Hari Ini", "Today Tasks")}
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" asChild>
                <Link href="/app/tasks">{t("Lihat semua", "View all")}</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {todayTasks.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-3 text-center">
                  <ListChecks className="h-6 w-6 text-slate-300" />
                  <p className="text-xs text-muted-foreground">{t("Tidak ada tugas hari ini", "No tasks today")}</p>
                  <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" asChild>
                    <Link href="/app/tasks">{t("Buat tugas", "New task")}</Link>
                  </Button>
                </div>
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
                    {taskPriorityLabel(task.priority, lang)}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("Keuangan", "Finance")}</h2>

      {/* Revenue sparkline — hero bar */}
      <Card className="bg-gradient-to-r from-slate-50 to-white">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t("Pendapatan (90 hari terakhir)", "Revenue (last 90 days)")}</p>
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
              {sparkTrend.toFixed(0)}% {t("vs 7 hari sebelumnya", "vs previous 7 days")}
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

      {/* YTD summary row — revenue, expense, net */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/app/invoices" className="group">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-muted-foreground">{t("Pendapatan YTD", "Revenue YTD")}</span>
              </div>
              <p className="text-xl font-bold text-emerald-700">{formatMoney(ytdRevenue, workspaceCurrency)}</p>
              {ytdRevenueUSD > 0 && (
                <p className="text-sm text-emerald-600 mt-0.5">{formatMoney(ytdRevenueUSD, "USD")}</p>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/expenses" className="group">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-4 w-4 text-red-500" />
                <span className="text-xs font-medium text-muted-foreground">{t("Pengeluaran bulan ini", "Expenses this month")}</span>
              </div>
              <p className="text-xl font-bold text-red-600">{formatMoney(expenseMonth, workspaceCurrency)}</p>
              {expenseMonthUSD > 0 && (
                <p className="text-sm text-red-500 mt-0.5">{formatMoney(expenseMonthUSD, "USD")}</p>
              )}
            </CardContent>
          </Card>
        </Link>
        <Link href="/app/reports" className="group">
          <Card className="transition-all hover:-translate-y-0.5 hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {ytdNet >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className="text-xs font-medium text-muted-foreground">{t("Bersih YTD", "Net YTD")}</span>
              </div>
              <p className={`text-xl font-bold ${ytdNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {formatMoney(ytdNet, workspaceCurrency)}
              </p>
              {ytdRevenueUSD > 0 && (
                <p className={`text-sm mt-0.5 ${ytdNetUSD >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  {formatMoney(ytdNetUSD, "USD")}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

{/* Cash flow forecast */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base font-semibold">
              <span>{t("Proyeksi arus kas", "Cash flow forecast")}</span>
              <Link
                href="/app/reports"
                className="text-xs font-normal text-muted-foreground hover:text-slate-950"
              >
                {t("Laporan →", "Reports →")}
              </Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: t("30 hari ke depan", "Next 30 days"), amt: cf30, usd: cf30usd, color: "bg-blue-500" },
              { label: t("31–60 hari", "31–60 days"), amt: cf60, usd: cf60usd, color: "bg-blue-400" },
              { label: t("61–90 hari", "61–90 days"), amt: cf90, usd: cf90usd, color: "bg-blue-300" },
            ].map((bucket) => (
              <div key={bucket.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{bucket.label}</span>
                  <div className="text-right">
                    <span className="font-semibold tabular-nums text-slate-950">
                      {formatMoney(bucket.amt, workspaceCurrency)}
                    </span>
                    {bucket.usd > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">+ {formatMoney(bucket.usd, "USD")}</span>
                    )}
                  </div>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full ${bucket.color} transition-all`}
                    style={{ width: `${(bucket.amt / cfMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {(cfOverdue > 0 || cfOverdueUsd > 0) && (
              <div className="mt-3 flex items-center justify-between rounded-lg border border-red-100 bg-red-50/50 px-3 py-2 text-sm">
                <span className="font-medium text-red-700">{t("Sudah terlambat", "Overdue")}</span>
                <div className="text-right">
                  {cfOverdue > 0 && (
                    <span className="font-semibold tabular-nums text-red-700">{formatMoney(cfOverdue, workspaceCurrency)}</span>
                  )}
                  {cfOverdueUsd > 0 && (
                    <span className={`font-semibold tabular-nums text-red-700 ${cfOverdue > 0 ? "ml-2 border-l border-red-200 pl-2 text-xs" : ""}`}>{formatMoney(cfOverdueUsd, "USD")}</span>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
