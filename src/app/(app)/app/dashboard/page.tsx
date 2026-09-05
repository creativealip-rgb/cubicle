import { requireAppSession } from "@/lib/app-auth";
import { getCurrentLang, getLocale, createT } from "@/lib/i18n";
import { db } from "@/db";
import {
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import {
  ArrowUpRight,
  BookOpen,
  TrendingUp,
  LayoutDashboard,
  FolderKanban,
  CheckSquare2,
  Bell,
  Receipt,
  FileCheck,
  FileText,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatMoneyCompact } from "@/lib/utils";
import Link from "next/link";
import { findWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { FirstWorkspaceModal } from "@/components/first-workspace-modal";
import { DashboardOnboarding } from "@/components/dashboard-onboarding";
import { PageHeader } from "@/components/ui/page-header";
import {
  aggregateToBase,
  buildRateMap,
  convertToBase,
  groupSumToBase,
} from "@/lib/currency-base";
import { cn } from "@/lib/utils";

export default async function DashboardPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const session = await requireAppSession("/app/dashboard");
  requireUser(session.user);
  const workspace = await findWorkspaceFullForCurrentUser();
  if (!workspace) {
    return (
      <div className="relative space-y-6" aria-hidden="true">
        <div className="space-y-2"><div className="h-8 w-56 rounded bg-muted" /><div className="h-4 w-72 rounded bg-muted" /></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }, (_, index) => <Card key={index}><CardContent className="h-24 p-4" /></Card>)}</div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]"><Card><CardContent className="h-64" /></Card><Card><CardContent className="h-64" /></Card></div>
        <FirstWorkspaceModal lang={lang} />
      </div>
    );
  }
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
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId} AND status = 'active') as active_projects,
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId}) as total_clients,
      (SELECT count(*)::int FROM projects WHERE workspace_id = ${workspaceId}) as total_projects,
      (SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId}) as total_invoices,
      (SELECT count(*)::int FROM time_entries WHERE workspace_id = ${workspaceId}) as total_time_entries,
      (SELECT count(*)::int FROM clients WHERE workspace_id = ${workspaceId} AND portal_enabled = true AND portal_token_hash IS NOT NULL AND portal_token_revoked_at IS NULL) as portal_active
    `,
  );
  const counts = result.rows[0] as Record<string, number>;
  const activeProjects = counts.active_projects || 0;
  const totalClients = counts.total_clients || 0;
  const totalProjects = counts.total_projects || 0;
  const totalInvoices = counts.total_invoices || 0;
  const totalTimeEntries = counts.total_time_entries || 0;
  const portalActive = counts.portal_active || 0;

  const now = new Date();
  const in7d = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
  const in7dDateStr = in7d.toISOString().split("T")[0]!;
  const attention = await db
    .select({
      tasksDueSoon: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status != 'done' AND due_date IS NOT NULL AND due_date <= ${in7dDateStr})`,
      noteReminders: sql<number>`(SELECT count(*)::int FROM personal_notes WHERE workspace_id = ${workspaceId} AND user_id = ${session?.user?.id ?? ""} AND status = 'open' AND due_date IS NOT NULL AND due_date <= ${in7d.toISOString()} AND title NOT LIKE ${"[journal]%"} AND title NOT LIKE ${"[site]%"})`,
      invoiceDueSoon: sql<number>`(SELECT count(*)::int FROM invoices WHERE workspace_id = ${workspaceId} AND status NOT IN ('paid','cancelled','archived') AND due_date IS NOT NULL AND due_date <= ${in7dDateStr})`,
      taskApprovals: sql<number>`(SELECT count(*)::int FROM tasks WHERE workspace_id = ${workspaceId} AND status = 'review' AND client_visible = true)`,
      proposalApprovals: sql<number>`(SELECT count(*)::int FROM proposals WHERE workspace_id = ${workspaceId} AND status IN ('sent','viewed'))`,
      contractApprovals: sql<number>`(SELECT count(*)::int FROM contracts WHERE workspace_id = ${workspaceId} AND status IN ('sent','viewed'))`,
    })
    .from(sql`(select 1) as _`)
    .limit(1);
  const att = attention[0] ?? {
    tasksDueSoon: 0,
    noteReminders: 0,
    invoiceDueSoon: 0,
    taskApprovals: 0,
    proposalApprovals: 0,
    contractApprovals: 0,
  };
  const approvalCounts = {
    tasks: Number(att.taskApprovals) || 0,
    proposals: Number(att.proposalApprovals) || 0,
    contracts: Number(att.contractApprovals) || 0,
  };
  const approvalTotal = approvalCounts.tasks + approvalCounts.proposals + approvalCounts.contracts;

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
  const _missingFxAll = Array.from(
    new Set([...missingFx, ...clientPieGrouped.missingCurrencies]),
  ).sort();

  // Recent activity slim
  const recentActivity = await db.execute(
    sql`SELECT al.id, al.action, al.entity_type as "entityType", al.created_at as "createdAt", u.name as "actorName"
    FROM activity_logs al
    LEFT JOIN users u ON u.id = al.actor_id
    WHERE al.workspace_id = ${workspaceId}
    ORDER BY al.created_at DESC
    LIMIT 6`,
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

  function getActivityIcon(entityType: string) {
    switch (entityType?.toLowerCase()) {
      case "invoice":
      case "payment":
        return Receipt;
      case "task":
        return CheckSquare2;
      case "project":
        return FolderKanban;
      case "proposal":
      case "contract":
        return FileText;
      default:
        return Layers;
    }
  }

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

  const pieColors = ["#6647F0", "#8b5cf6", "#10b981", "#f59e0b", "#ec4899"];

  type ReminderTone = "rose" | "amber" | "blue" | "purple" | "emerald";
  type ReminderItem = {
    key: string;
    label: string;
    href: string;
    tone: ReminderTone;
    icon: typeof FolderKanban;
    count: number;
    meta: string;
  };

  const reminderItems: ReminderItem[] = [
    {
      key: "active-projects",
      label: t("Proyek Aktif", "Active Projects"),
      href: "/app/projects?status=active",
      tone: "blue",
      icon: FolderKanban,
      count: activeProjects,
      meta: t("Sedang berjalan", "In progress"),
    },
    {
      key: "tasks-due",
      label: t("Tugas Due", "Tasks Due"),
      href: "/app/tasks?view=weekly",
      tone: "amber",
      icon: CheckSquare2,
      count: Number(att.tasksDueSoon) || 0,
      meta: t("7 hari ke depan", "Next 7 days"),
    },
    {
      key: "note-reminders",
      label: t("Reminder", "Reminders"),
      href: "/app/personal",
      tone: "emerald",
      icon: Bell,
      count: Number(att.noteReminders) || 0,
      meta: t("Catatan & alert", "Notes & alerts"),
    },
    {
      key: "invoice-due",
      label: t("Invoice Due", "Invoice Due"),
      href: "/app/invoices?status=overdue",
      tone: "rose",
      icon: Receipt,
      count: Number(att.invoiceDueSoon) || 0,
      meta: t("Belum terbayar", "Unpaid & due"),
    },
    {
      key: "approval",
      label: t("Approval", "Approval"),
      href: "/app/tasks?status=review",
      tone: "purple",
      icon: FileCheck,
      count: approvalTotal,
      meta: t("Perlu ditinjau", "Needs review"),
    },
  ];

  const toneConfig: Record<ReminderTone, { bg: string; text: string; ring: string; dot: string }> = {
    blue: {
      bg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      text: "text-blue-600 dark:text-blue-400",
      ring: "group-hover:border-blue-500/40",
      dot: "bg-blue-600",
    },
    amber: {
      bg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      text: "text-amber-600 dark:text-amber-400",
      ring: "group-hover:border-amber-500/40",
      dot: "bg-amber-600",
    },
    emerald: {
      bg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      text: "text-emerald-600 dark:text-emerald-400",
      ring: "group-hover:border-emerald-500/40",
      dot: "bg-emerald-600",
    },
    rose: {
      bg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      text: "text-rose-600 dark:text-rose-400",
      ring: "group-hover:border-rose-500/40",
      dot: "bg-rose-600",
    },
    purple: {
      bg: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
      text: "text-purple-600 dark:text-purple-400",
      ring: "group-hover:border-purple-500/40",
      dot: "bg-purple-600",
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. Universal Standard PageHeader matching other pages */}
      <PageHeader
        icon={LayoutDashboard}
        title={`${t("Selamat datang,", "Welcome back,")} ${firstName}`}
        description={t(
          `Ringkasan performa operasional, proyek, keuangan, dan tugas di ${workspace.name}.`,
          `Operational performance, projects, finance, and task summary in ${workspace.name}.`
        )}
      />

      {/* Onboarding Checklist if new */}
      <DashboardOnboarding
        lang={lang}
        steps={[
          { key: "workspace", done: workspaceProfileDone, href: "/app/settings?tab=workspace" },
          { key: "invoiceSettings", done: invoiceSettingsDone, href: "/app/settings?tab=invoice" },
          { key: "client", done: totalClients > 0, href: "/app/clients" },
          { key: "project", done: totalProjects > 0, href: "/app/projects" },
          { key: "time", done: totalTimeEntries > 0, href: "/app/time" },
          { key: "invoice", done: totalInvoices > 0, href: "/app/invoices" },
          { key: "portal", done: portalActive > 0, href: "/app/clients" },
        ]}
      />

      {/* 2. Executive 5-KPI Strip with Squircle Visual Anchors */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t("Ringkasan Tindakan & Pengingat", "Action & Reminder Pulse")}
          </h2>
          <span className="text-xs text-muted-foreground font-mono">
            {now.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </div>

        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-5">
          {reminderItems.map((item) => {
            const Icon = item.icon;
            const cfg = toneConfig[item.tone];

            if (item.key === "approval") {
              return (
                <Popover key={item.key}>
                  <PopoverTrigger asChild>
                    <button type="button" className="group text-left h-full">
                      <div className={cn("h-full rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:shadow-sm hover:border-primary/40 flex flex-col justify-between space-y-2.5", cfg.ring)}>
                        <div className="flex items-start justify-between gap-2">
                          <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-bold rounded-full border", approvalTotal > 0 ? "border-purple-500/30 bg-purple-500/10 text-purple-600" : "border-border text-muted-foreground")}>
                            <span className={cn("h-1 w-1 rounded-full mr-1", cfg.dot)} />
                            {approvalTotal}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">{item.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.meta}</p>
                        </div>
                      </div>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72 p-2 rounded-2xl">
                    <p className="px-2 py-1.5 text-xs font-bold text-foreground">{t("Approval klien tertunda", "Pending client approvals")}</p>
                    {approvalTotal === 0 ? (
                      <p className="px-2 py-4 text-xs text-muted-foreground text-center">{t("Tidak ada approval tertunda", "No pending approvals")}</p>
                    ) : (
                      <div className="space-y-1">
                        {approvalCounts.tasks > 0 && (
                          <Link href="/app/tasks?status=review" className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium hover:bg-muted transition-colors">
                            <span className="flex items-center gap-1.5"><CheckSquare2 className="h-3.5 w-3.5 text-primary" /> {t("Task Review", "Task Review")}</span>
                            <Badge variant="secondary" className="h-5 text-[10px]">{approvalCounts.tasks}</Badge>
                          </Link>
                        )}
                        {approvalCounts.proposals > 0 && (
                          <Link href="/app/proposals?status=sent" className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium hover:bg-muted transition-colors">
                            <span className="flex items-center gap-1.5"><FileText className="h-3.5 w-3.5 text-primary" /> {t("Proposal", "Proposals")}</span>
                            <Badge variant="secondary" className="h-5 text-[10px]">{approvalCounts.proposals}</Badge>
                          </Link>
                        )}
                        {approvalCounts.contracts > 0 && (
                          <Link href="/app/contracts?status=sent" className="flex items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium hover:bg-muted transition-colors">
                            <span className="flex items-center gap-1.5"><FileCheck className="h-3.5 w-3.5 text-primary" /> {t("Kontrak", "Contracts")}</span>
                            <Badge variant="secondary" className="h-5 text-[10px]">{approvalCounts.contracts}</Badge>
                          </Link>
                        )}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              );
            }

            return (
              <Link key={item.key} href={item.href} className="group">
                <div className={cn("h-full rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:shadow-sm hover:border-primary/40 flex flex-col justify-between space-y-2.5", cfg.ring)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl", cfg.bg)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] h-5 px-2 font-bold rounded-full border", item.count > 0 ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted-foreground")}>
                      <span className={cn("h-1 w-1 rounded-full mr-1", cfg.dot)} />
                      {item.count}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.meta}</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Main Dashboard Grid (Recent Activity & Finance Pulse) */}
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Column: Recent Activity */}
        <div className="space-y-6">
          <Card className="rounded-2xl border border-border/80 bg-card shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/60 px-4 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-3.5 w-3.5" />
                </div>
                <CardTitle className="text-sm font-bold text-foreground">
                  {t("Aktivitas Terbaru", "Recent Activity")}
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10 rounded-lg gap-1" asChild>
                <Link href="/app/tasks">
                  {t("Semua Tugas", "All Tasks")}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0 divide-y divide-border/60">
              {activityRows.length === 0 ? (
                <p className="text-xs text-muted-foreground py-10 text-center">
                  {t("Belum ada riwayat aktivitas di workspace ini.", "No activity recorded yet in this workspace.")}
                </p>
              ) : (
                activityRows.map((item) => {
                  const ActivityIcon = getActivityIcon(item.entityType);
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-muted/30">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                          <ActivityIcon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{formatAction(item.action)}</p>
                          <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                            <span className="capitalize">{item.entityType}</span>
                            {item.actorName && ` · ${t("oleh", "by")} ${item.actorName}`}
                          </p>
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {formatRelative(item.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Pulse & Docs Hub */}
        <div className="space-y-4">
          {/* Finance card with Brand #6647F0 Glow & Sparkline */}
          <Card className="rounded-2xl border border-border/80 bg-card p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <TrendingUp className="h-3.5 w-3.5" />
                </div>
                <h3 className="text-sm font-bold text-foreground">{t("Arus Kas 30 Hari", "30-Day Cash Flow")}</h3>
              </div>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
                <Link href="/app/reports">{t("Laporan →", "Reports →")}</Link>
              </Button>
            </div>

            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">
                {t(
                  `Penerimaan Pembayaran (${workspaceCurrency})`,
                  `Payment Collections (${workspaceCurrency})`
                )}
              </span>
              <p className="text-2xl font-black tracking-tight text-foreground">
                {formatMoneyCompact(sparkTotal || rev30, workspaceCurrency)}
              </p>
            </div>

            {/* Brand Purple Sparkline */}
            <div className="rounded-xl border border-border/60 bg-muted/20 p-2.5">
              <svg
                viewBox={`0 0 ${sparkW} ${sparkH}`}
                className="h-10 w-full"
                preserveAspectRatio="none"
                aria-label="Revenue trend last 30 days"
              >
                <defs>
                  <linearGradient id="brandPurpleSparkFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6647F0" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6647F0" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path d={sparkArea} fill="url(#brandPurpleSparkFill)" />
                <path
                  d={sparkPath}
                  fill="none"
                  stroke="#6647F0"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* Top Clients Breakdown */}
            <div className="space-y-2 pt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                {t("Top Klien (30 Hari)", "Top Clients (30d)")}
              </p>
              {clientPie.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-1">
                  {t("Belum ada data pembayaran.", "No payment records.")}
                </p>
              ) : (
                <div className="space-y-2">
                  {clientPie.slice(0, 3).map((c, i) => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: pieColors[i % pieColors.length] }}
                        />
                        <span className="truncate font-medium text-foreground">{c.name}</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground shrink-0">
                        {formatMoneyCompact(c.total, workspaceCurrency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Knowledge & AI Hub Banner */}
          <Link
            href="/app/docs"
            className="group flex items-center gap-3.5 rounded-2xl border border-border/80 bg-gradient-to-br from-primary/[0.06] via-violet-500/[0.03] to-transparent p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20 group-hover:scale-105 transition-transform">
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-foreground">{t("Pusat Dokumentasi", "Documentation Hub")}</p>
                <Sparkles className="h-3 w-3 text-primary animate-pulse" />
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                {t("19 Panduan modul lengkap: Invoice, Client Portal, 2FA, & Calendar.", "19 Guides: Invoices, Client Portal, 2FA, & Calendar.")}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
