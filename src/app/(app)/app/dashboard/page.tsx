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
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";

async function getWorkspaceId() {
  const [ws] = await db.select({ id: workspaces.id }).from(workspaces).where(eq(workspaces.slug, "acme-creative")).limit(1);
  if (!ws) throw new Error("Workspace not found");
  return ws.id;
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const _user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();

  // KPI counts
  const result = await db.execute(
    sql`SELECT
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND status = 'active') as active_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId} AND status = 'active') as active_projects,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done') as due_tasks,
      (SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date IS NOT NULL AND due_date < current_date) as overdue_tasks,
      (SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status IN ('sent','overdue')) as unpaid_invoices
    `,
  );
  const counts = result.rows[0] as Record<string, number>;
  const activeClients = counts.active_clients || 0;
  const activeProjects = counts.active_projects || 0;
  const dueTasks = counts.due_tasks || 0;
  const overdueTasks = counts.overdue_tasks || 0;
  const unpaidCount = counts.unpaid_invoices || 0;

  // Unpaid invoices total
  let unpaidAmount = 0;
  try {
    const result = await db.execute(
      sql`SELECT coalesce(sum(total), 0)::decimal as amt FROM invoices WHERE workspace_id = ${workspaceId} AND status = 'sent'`,
    );
    unpaidAmount = Number((result.rows[0] as { amt: string })?.amt ?? 0);
  } catch {
    // ignore
  }

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
    .orderBy(tasks.priority)
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
        sql`${invoices.status} in ('sent', 'overdue')`,
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
    if (diffHrs < 1) return "Just now";
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(date).toLocaleDateString();
  }

  function formatAction(action: string): string {
    return action
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  const kpiCards = [
    {
      label: "Active Clients",
      value: String(activeClients),
      change: `${activeClients} total`,
      icon: Users,
      iconBg: "bg-blue-100 text-blue-600",
      href: "/app/clients",
    },
    {
      label: "Active Projects",
      value: String(activeProjects),
      change: `${activeProjects} in progress`,
      icon: Briefcase,
      iconBg: "bg-emerald-100 text-emerald-600",
      href: "/app/projects",
    },
    {
      label: "Due Tasks",
      value: String(dueTasks),
      change: `${overdueTasks} overdue`,
      icon: CheckSquare,
      iconBg: "bg-amber-100 text-amber-600",
      href: "/app/tasks",
    },
    {
      label: "Unpaid Invoices",
      value: `Rp ${unpaidAmount.toLocaleString("id-ID")}`,
      change: `${unpaidCount} pending`,
      icon: Receipt,
      iconBg: "bg-red-100 text-red-600",
      href: "/app/invoices",
    },
  ];

  // Greeting + quick action chips
  const hour = new Date().getHours();
  const greeting = hour < 11 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const todayLong = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const firstName = (session?.user?.name || "there").split(" ")[0];

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
    { label: "New task", icon: CheckSquare, href: "/app/tasks" },
    { label: "New invoice", icon: FileText, href: "/app/invoices" },
    { label: "Start timer", icon: Timer, href: "/app/time" },
    { label: "Add client", icon: Plus, href: "/app/clients" },
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
            {todayLong} · {activeProjects} active projects · {dueTasks} tasks due
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
                className="gap-1.5 bg-white"
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

      {/* KPI Cards + Revenue trend (sparkline card) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href} className="lg:col-span-1">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{kpi.label}</p>
                      <p className="text-3xl font-bold tracking-tight">
                        {kpi.value}
                      </p>
                      <p className="text-xs text-muted-foreground">{kpi.change}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${kpi.iconBg}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}

        {/* Revenue sparkline — 14d */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Revenue (14d)</p>
                <p className="text-2xl font-bold tracking-tight">
                  Rp {Math.round(sparkTotal).toLocaleString("id-ID")}
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
                  {sparkTrend.toFixed(0)}% vs prior 7d
                </p>
              </div>
            </div>
            <svg
              viewBox={`0 0 ${sparkW} ${sparkH}`}
              className="mt-4 h-14 w-full"
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
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
              <Link href="/app/tasks">
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
            )}
            {recentActivity.map((item, i) => (
              <div key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <p className="text-sm font-medium">
                      {formatAction(item.action)}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {item.entityType}
                      {item.actorName && ` by ${item.actorName}`}
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Active Timer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTimer ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{activeTimer.description || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{activeTimer.userName || "Unknown"}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                      <Clock className="h-5 w-5 text-emerald-600 animate-pulse" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Started {activeTimer.startTime ? formatRelative(activeTimer.startTime) : "—"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full border-4 border-muted">
                    <Clock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">No active timer</p>
                  <p className="text-xs text-muted-foreground">
                    Start tracking time on a task
                  </p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1">
                    <Clock className="h-3 w-3" />
                    Start Timer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Upcoming
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <Calendar className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="text-sm font-medium">No upcoming events</p>
                  <p className="text-xs text-muted-foreground">
                    Your schedule is clear
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingAppts.map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3">
                      <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{apt.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(apt.startTime).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                Unpaid Invoices
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/app/invoices">
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {unpaidInvoices.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No unpaid invoices</p>
              )}
              {unpaidInvoices.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.clientName || "Unknown"} · Due {inv.dueDate || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={inv.status === "overdue" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {inv.status === "overdue" && (
                        <AlertCircle className="mr-1 h-3 w-3" />
                      )}
                      {inv.status}
                    </Badge>
                    <span className="text-sm font-semibold">
                      {inv.currency} {Number(inv.total).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <ListChecks className="h-4 w-4 text-muted-foreground" />
                Today&apos;s Tasks
              </CardTitle>
              <Button variant="ghost" size="sm" className="gap-1 text-xs" asChild>
                <Link href="/app/tasks">
                  View all
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {todayTasks.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No tasks due today</p>
              )}
              {todayTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    {task.assigneeName && (
                      <p className="text-xs text-muted-foreground">{task.assigneeName}</p>
                    )}
                  </div>
                  <Badge
                    variant={
                      task.priority === "urgent"
                        ? "destructive"
                        : task.priority === "high"
                          ? "default"
                          : "secondary"
                    }
                    className="text-xs shrink-0"
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
