import { requireAppSession } from "@/lib/app-auth";
import { getCurrentLang, getLocale, createT } from "@/lib/i18n";
import { db } from "@/db";
import {
  appointments,
  personalNotes,
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, and, sql, gte } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import {
  Users,
  Briefcase,
  ArrowUpRight,
  TrendingUp,
  ListChecks,
  ArrowRight,
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
import {
  aggregateToBase,
  buildRateMap,
  convertToBase,
  groupSumToBase,
} from "@/lib/currency-base";

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
  const workspaceProfileDone = Boolean(
    workspace.billingName &&
      workspace.billingEmail &&
      (workspace.billingAddress || workspace.logoUrl || workspace.billingPhone),
  );
  const invoiceSettingsDone = Boolean(
    workspace.defaultCurrency &&
      (workspace.defaultInvoiceTerms || workspace.defaultHourlyRate),
  );

  const result = await db.execute(
    sql`SELECT
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND status = 'active') as active_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId} AND status = 'active') as active_projects,
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

  // Revenue last 30 days only (payments) — convert to base currency
  const rateRows = await db
    .select({
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const rateMap = buildRateMap(rateRows);

  const rev30Result = await db.execute(
    sql`SELECT i.currency, coalesce(sum(p.amount), 0)::decimal AS total
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    WHERE i.workspace_id = ${workspaceId}
      AND p.paid_at >= current_date - interval '30 days'
    GROUP BY i.currency`,
  );
  const rev30Agg = aggregateToBase(
    (rev30Result.rows as Array<{ currency: string; total: string }>).map((row) => ({
      currency: row.currency,
      amount: Number(row.total) || 0,
    })),
    workspaceCurrency,
    rateMap,
  );
  const rev30 = rev30Agg.total;
  const missingFx = rev30Agg.missingCurrencies;

  // Sparkline 30 days — convert each payment day×currency to base
  const sparkRawResult = await db.execute(
    sql`SELECT p.paid_at::date AS day, i.currency, coalesce(sum(p.amount), 0)::decimal AS amt
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    WHERE i.workspace_id = ${workspaceId}
      AND p.paid_at >= current_date - interval '29 days'
    GROUP BY p.paid_at::date, i.currency
    ORDER BY day ASC`,
  );
  const dayTotals = new Map<string, number>();
  for (const row of sparkRawResult.rows as Array<{
    day: string | Date;
    currency: string;
    amt: string | number;
  }>) {
    const day = String(row.day).slice(0, 10);
    const converted = convertToBase(Number(row.amt) || 0, row.currency, workspaceCurrency, rateMap);
    if (converted === null) continue;
    dayTotals.set(day, (dayTotals.get(day) || 0) + converted);
  }
  // Fill full 30-day series
  const sparkline: { day: string; amt: number }[] = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    sparkline.push({ day: key, amt: dayTotals.get(key) || 0 });
  }

  // Client revenue pie (paid last 30d, top 5) — base currency
  const clientPieResult = await db.execute(
    sql`SELECT c.name AS client_name, i.currency, coalesce(sum(p.amount), 0)::decimal AS total
    FROM payments p
    JOIN invoices i ON i.id = p.invoice_id
    JOIN clients c ON c.id = i.client_id
    WHERE i.workspace_id = ${workspaceId}
      AND p.paid_at >= current_date - interval '30 days'
    GROUP BY c.name, i.currency
    ORDER BY total DESC`,
  );
  const clientPieGrouped = groupSumToBase(
    (clientPieResult.rows as Array<{ client_name: string; currency: string; total: string }>).map(
      (r) => ({
        key: r.client_name,
        currency: r.currency,
        amount: Number(r.total) || 0,
      }),
    ),
    workspaceCurrency,
    rateMap,
  );
  const clientPie = clientPieGrouped.groups.slice(0, 5).map((g) => ({
    name: g.key,
    total: g.total,
  }));
  const missingFxAll = Array.from(
    new Set([...missingFx, ...clientPieGrouped.missingCurrencies]),
  ).sort();

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

  const renderNowMs = now.getTime();

  function formatRelative(date: Date | string): string {
    const diffMs = renderNowMs - new Date(date).getTime();
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
  ];

  const firstName = (session?.user?.name || "User").split(" ")[0];

  const sparkW = 240;
  const sparkH = 48;
  const maxAmt = Math.max(...sparkline.map((d) => d.amt), 1);
  const sparkPoints = sparkline.map((d, i) => {
    const x = (i / Math.max(sparkline.length - 1, 1)) * sparkW;
    const y = sparkH - (d.amt / maxAmt) * (sparkH - 12) - 6;
    return `${x},${y}`;
  });
  const sparkPath = sparkPoints.length > 0 ? `M ${sparkPoints.join(" L ")}` : "";
  const sparkArea =
    sparkPoints.length > 0
      ? `M 0,${sparkH} L ${sparkPoints.join(" L ")} L ${sparkW},${sparkH} Z`
      : "";
  const sparkTotal = sparkline.reduce((s, d) => s + d.amt, 0);

  const pieColors = ["#2563eb", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

  type ReminderTone = "rose" | "amber" | "blue" | "purple" | "slate";
  type ReminderGroupKey = "urgent" | "action" | "scheduled";
  type ReminderItem = {
    key: string;
    label: string;
    href: string;
    tone: ReminderTone;
    group: ReminderGroupKey;
    count?: number;
    meta?: string;
  };

  const reminderItems: ReminderItem[] = [];
  if (att.overdueInvoices > 0) {
    reminderItems.push({
      key: "inv-overdue",
      label: t("Invoice jatuh tempo", "Overdue invoices"),
      href: "/app/invoices?status=overdue",
      tone: "rose",
      group: "urgent",
      count: att.overdueInvoices,
    });
  }
  if (att.tasksDueToday > 0) {
    reminderItems.push({
      key: "task-today",
      label: t("Tugas perlu dikerjakan", "Tasks due"),
      href: "/app/tasks?filter=today",
      tone: "amber",
      group: "urgent",
      count: att.tasksDueToday,
    });
  }
  if (att.clientApprovals > 0) {
    reminderItems.push({
      key: "approval",
      label: t("Approval task client", "Client task approval"),
      href: "/app/tasks?status=review",
      tone: "purple",
      group: "action",
      count: att.clientApprovals,
    });
  }
  // Contract reminder hidden while Sales nav is off.
  // if (att.contractsAwaiting > 0) {
  //   reminderItems.push({
  //     key: "contract",
  //     label: t("Kontrak menunggu", "Awaiting contracts"),
  //     href: "/app/contracts",
  //     tone: "blue",
  //     group: "action",
  //     count: att.contractsAwaiting,
  //   });
  // }
  for (const apt of upcomingAppts.slice(0, 3)) {
    reminderItems.push({
      key: `apt-${apt.id}`,
      label: apt.title,
      href: "/app/calendar",
      tone: "slate",
      group: "scheduled",
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
      group: "scheduled",
      meta: r.dueDate
        ? new Date(r.dueDate).toLocaleDateString(locale, {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
        : undefined,
    });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-5 sm:flex-row sm:items-end sm:justify-between">
        <DashboardGreeting firstName={firstName} lang={lang} />
      </div>

      <DashboardOnboarding
        lang={lang}
        steps={[
          { key: "workspace", done: workspaceProfileDone, href: "/app/settings" },
          { key: "invoiceSettings", done: invoiceSettingsDone, href: "/app/settings?tab=branding" },
          { key: "client", done: totalClients > 0, href: "/app/clients" },
          { key: "project", done: totalProjects > 0, href: "/app/projects" },
          { key: "time", done: totalTimeEntries > 0, href: "/app/time" },
          { key: "invoice", done: totalInvoices > 0, href: "/app/invoices" },
          { key: "portal", done: portalActive > 0, href: "/app/clients" },
        ]}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-6">
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {t("Kerja", "Work")}
            </h2>
            <div className="grid grid-cols-2 gap-4">
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

          <Card>
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
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start xl:pt-[30px]">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-start justify-between gap-3 text-sm font-semibold">
                <span>
                  {t("Perlu ditangani", "Needs attention")}
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                    {reminderItems.length}
                  </span>
                </span>
                <ListChecks className="mt-0.5 h-4 w-4 text-slate-400" />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("Prioritas aktif yang belum selesai", "Active priorities that still need work")}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              {reminderItems.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-muted-foreground">
                  <ListChecks className="h-4 w-4" />
                  {t("Tidak ada prioritas aktif", "No active priorities")}
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {reminderItems.slice(0, 5).map((item) => {
                    const itemToneClass: Record<ReminderTone, string> = {
                      rose: "bg-rose-500 text-rose-700",
                      amber: "bg-amber-500 text-amber-700",
                      blue: "bg-blue-500 text-blue-700",
                      purple: "bg-purple-500 text-purple-700",
                      slate: "bg-slate-400 text-slate-700",
                    };
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className="group -mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm transition-colors hover:bg-slate-50/80"
                      >
                        <div className="min-w-0 flex items-center gap-2.5">
                          <span className={`h-2 w-2 shrink-0 rounded-full ${itemToneClass[item.tone].split(" ")[0]}`} />
                          <span className="truncate font-medium text-slate-900">{item.label}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {item.count != null && (
                            <Badge variant="secondary" className="h-5 rounded-full px-1.5 text-[10px]">
                              {item.count}
                            </Badge>
                          )}
                          {item.meta && (
                            <span className="whitespace-nowrap text-[11px] text-muted-foreground">
                              {item.meta}
                            </span>
                          )}
                          <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-500" />
                        </div>
                      </Link>
                    );
                  })}
                  {reminderItems.length > 5 && (
                    <Link href="/app/tasks" className="block pt-2 text-xs font-medium text-blue-600 hover:text-blue-700">
                      {t(`+${reminderItems.length - 5} lainnya`, `+${reminderItems.length - 5} more`)}
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          {/* Finance sidebar: 30d revenue only */}
          <Card className="bg-gradient-to-b from-slate-50 to-white">
            <CardHeader className="pb-1">
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
            <CardContent className="space-y-2.5">
              <div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    `Pendapatan 30 hari (setara ${workspaceCurrency})`,
                    `Revenue last 30 days (equiv. ${workspaceCurrency})`,
                  )}
                </p>
                <p className="text-xl font-bold tracking-tight">
                  {formatMoneyCompact(sparkTotal || rev30, workspaceCurrency)}
                </p>
                {missingFxAll.length > 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t(
                      `Kurs belum di-set: ${missingFxAll.join(", ")}. `,
                      `Missing FX rates: ${missingFxAll.join(", ")}. `,
                    )}
                    <Link href="/app/settings?tab=workspace" className="underline underline-offset-2">
                      {t("Atur di Settings", "Set in Settings")}
                    </Link>
                  </p>
                )}
              </div>
              <svg
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                className="h-9 w-full"
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
                <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                  {t("Pendapatan per klien", "Revenue by client")}
                </p>
                {clientPie.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Belum ada pembayaran 30 hari", "No payments in 30 days")}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {clientPie.slice(0, 2).map((c, i) => (
                      <div key={c.name} className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="min-w-0 flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: pieColors[i % pieColors.length] }}
                          />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="shrink-0 font-medium text-slate-700">
                          {formatMoneyCompact(c.total, workspaceCurrency)}
                        </span>
                      </div>
                    ))}
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
