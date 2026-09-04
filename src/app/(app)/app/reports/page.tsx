import { headers } from "next/headers";
import Link from "next/link";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  Clock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  clients,
  expenseCategories,
  expenses,
  invoices,
  payments,
  projects,
  timeEntries,
  tasks,
  users,
  workspaceCurrencyRates,
} from "@/db/schema";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import {
  buildRateMap,
  convertToBase,
  normalizeCurrency,
  type RateMap,
} from "@/lib/currency-base";
import {
  buildReportPeriod,
  buildTimeGroups,
  reportPeriodLabel,
} from "@/lib/report-period";
import { ReportControls } from "@/components/reports/report-controls";
import { buildTimeReport } from "@/lib/time-reporting";
import { effectiveWorkDateSql } from "@/lib/effective-work-date";
import { parseReportTab, withQuery } from "@/lib/finance-tabs";
import { IncomeExpenseChart } from "@/components/reports/income-expense-chart";
import { PersonalReportSection } from "@/components/reports/personal-report-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function convert(
  amount: string | number | null,
  currency: string,
  base: string,
  rates: RateMap,
  missing: Set<string>,
) {
  const value = typeof amount === "number" ? amount : Number(amount ?? 0);
  const converted = convertToBase(value, currency, base, rates);
  if (converted === null) {
    const normalized = normalizeCurrency(currency);
    if (normalized !== base) missing.add(normalized);
  }
  return converted;
}

function deltaText(current: number, previous: number, lang: string) {
  if (Math.abs(previous) < 0.000001)
    return lang === "en"
      ? "No previous comparison"
      : "Belum ada pembanding lalu";
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0)
    return lang === "en"
      ? "Same as previous"
      : "Sama dengan lalu";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)}% ${lang === "en" ? "vs last period" : "vs periode lalu"}`;
}

function ReportTabs({ active, financeHref, timeHref, financeLabel, timeLabel }: { active: "finance" | "time"; financeHref: string; timeHref: string; financeLabel: string; timeLabel: string }) {
  return (
    <StatusFilterTabs
      activeValue={active}
      hideEmpty={false}
      listClassName="w-full sm:w-auto"
      className="border border-border/70"
      tabs={[
        { value: "finance", label: financeLabel, href: financeHref, alwaysShow: true },
        { value: "time", label: timeLabel, href: timeHref, alwaysShow: true },
      ]}
    />
  );
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string; scope?: "business" | "personal" }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const query = await searchParams;
  const scope = query.scope === "personal" ? "personal" : "business";
  const activeTab = parseReportTab(query.tab);
  const period = buildReportPeriod(query);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  await assertWorkspaceMember(db, user.id, ws.id);

  const baseCurrency = normalizeCurrency(ws.defaultCurrency || "IDR");
  const rateRows = await db
    .select({
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, ws.id));
  const rates = buildRateMap(rateRows);
  const missingFx = new Set<string>();

  const allIncomeRows = await db
    .select({
      paidAt: payments.paidAt,
      amount: payments.amount,
      currency: invoices.currency,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        gte(payments.paidAt, period.comparisonStart),
        lte(payments.paidAt, period.end),
      ),
    );
  const allExpenseRows = await db
    .select({
      date: expenses.date,
      amount: expenses.amount,
      currency: expenses.currency,
      categoryId: expenseCategories.id,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(
      and(
        eq(expenses.workspaceId, ws.id),
        gte(expenses.date, period.comparisonStart),
        lte(expenses.date, period.end),
      ),
    );

  let income = 0;
  let previousIncome = 0;
  const clientMap = new Map<
    string,
    { id: string; name: string; total: number; count: number }
  >();
  for (const row of allIncomeRows) {
    const value = convert(
      row.amount,
      row.currency,
      baseCurrency,
      rates,
      missingFx,
    );
    if (value === null) continue;
    if (row.paidAt >= period.start) {
      income += value;
      const current = clientMap.get(row.clientId) ?? {
        id: row.clientId,
        name: row.clientName,
        total: 0,
        count: 0,
      };
      current.total += value;
      current.count += 1;
      clientMap.set(row.clientId, current);
    } else previousIncome += value;
  }

  let expenseTotal = 0;
  let previousExpense = 0;
  const categoryMap = new Map<
    string,
    { name: string; color: string | null; total: number; count: number }
  >();
  for (const row of allExpenseRows) {
    const value = convert(
      row.amount,
      row.currency,
      baseCurrency,
      rates,
      missingFx,
    );
    if (value === null) continue;
    if (row.date >= period.start) {
      expenseTotal += value;
      const key = row.categoryId ?? "uncategorized";
      const current = categoryMap.get(key) ?? {
        name: row.categoryName ?? t("Tanpa kategori", "Uncategorized"),
        color: row.categoryColor,
        total: 0,
        count: 0,
      };
      current.total += value;
      current.count += 1;
      categoryMap.set(key, current);
    } else previousExpense += value;
  }
  const net = income - expenseTotal;
  const previousNet = previousIncome - previousExpense;

  const groups = buildTimeGroups(period.start, period.end, period.preset, lang);
  const chartPoints = groups.map((group) => ({
    key: group.key,
    label: group.label,
    income: 0,
    expense: 0,
  }));
  for (const row of allIncomeRows) {
    if (row.paidAt < period.start) continue;
    const index = groups.findIndex(
      (g) => row.paidAt >= g.start && row.paidAt <= g.end,
    );
    const value = convertToBase(
      Number(row.amount),
      row.currency,
      baseCurrency,
      rates,
    );
    if (index >= 0 && value !== null) chartPoints[index].income += value;
  }
  for (const row of allExpenseRows) {
    if (row.date < period.start) continue;
    const index = groups.findIndex(
      (g) => row.date >= g.start && row.date <= g.end,
    );
    const value = convertToBase(
      Number(row.amount),
      row.currency,
      baseCurrency,
      rates,
    );
    if (index >= 0 && value !== null) chartPoints[index].expense += value;
  }

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  const topCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const today = new Date().toISOString().slice(0, 10);
  const agingRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      client: clients.name,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      paid: sql<string>`coalesce((select sum(${payments.amount}) from ${payments} where ${payments.invoiceId} = ${invoices.id}), 0)::text`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        inArray(invoices.status, ["sent", "viewed", "overdue"]),
      ),
    );
  const receivables: Array<{
    id: string;
    invoiceNumber: string;
    client: string;
    remaining: number;
    remainingBase: number | null;
    currency: string;
    dueDate: string;
    daysOverdue: number;
  }> = [];
  let unpaidTotal = 0;
  let overdueTotal = 0;
  for (const row of agingRows) {
    const remaining = Math.max(0, Number(row.total) - Number(row.paid));
    if (remaining <= 0.000001) continue;
    const base = convert(
      remaining,
      row.currency,
      baseCurrency,
      rates,
      missingFx,
    );
    const daysOverdue =
      row.dueDate && row.dueDate < today
        ? Math.floor(
            (Date.parse(`${today}T00:00:00Z`) -
              Date.parse(`${row.dueDate}T00:00:00Z`)) /
              86400000,
          )
        : 0;
    if (base !== null) {
      unpaidTotal += base;
      if (daysOverdue > 0) overdueTotal += base;
    }
    receivables.push({
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      client: row.client,
      remaining,
      remainingBase: base,
      currency: row.currency,
      dueDate: row.dueDate ?? "",
      daysOverdue,
    });
  }
  const overdueItems = receivables
    .filter((item) => item.daysOverdue > 0)
    .sort(
      (a, b) =>
        b.daysOverdue - a.daysOverdue || a.dueDate.localeCompare(b.dueDate),
    );

  const projectExpenseRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: clients.name,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(expenses, eq(expenses.projectId, projects.id))
    .where(
      and(
        eq(projects.workspaceId, ws.id),
        gte(expenses.date, period.start),
        lte(expenses.date, period.end),
      ),
    )
    .groupBy(projects.id, projects.name, clients.name, expenses.currency);
  const projectMap = new Map<
    string,
    {
      id: string;
      name: string;
      client: string | null;
      total: number;
      count: number;
    }
  >();
  for (const row of projectExpenseRows) {
    const value = convert(
      row.total,
      row.currency,
      baseCurrency,
      rates,
      missingFx,
    );
    if (value === null) continue;
    const current = projectMap.get(row.id) ?? {
      id: row.id,
      name: row.name,
      client: row.clientName,
      total: 0,
      count: 0,
    };
    current.total += value;
    current.count += row.count;
    projectMap.set(row.id, current);
  }
  const projectExpenses = Array.from(projectMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const detailedTimeRows = await db.select({ clientId: timeEntries.clientId, clientName: clients.name, projectId: timeEntries.projectId, projectName: projects.name, taskId: timeEntries.taskId, taskTitle: tasks.title, userId: timeEntries.userId, userName: users.name, durationMinutes: timeEntries.durationMinutes, billable: timeEntries.billable, hourlyRate: timeEntries.hourlyRate }).from(timeEntries).leftJoin(clients, eq(clients.id, timeEntries.clientId)).leftJoin(projects, eq(projects.id, timeEntries.projectId)).leftJoin(tasks, eq(tasks.id, timeEntries.taskId)).leftJoin(users, eq(users.id, timeEntries.userId)).where(and(eq(timeEntries.workspaceId, ws.id), gte(effectiveWorkDateSql(timeEntries), period.start), lte(effectiveWorkDateSql(timeEntries), period.end)));
  const timeReport = buildTimeReport(detailedTimeRows);

  const missingFxList = Array.from(missingFx).sort();
  const currentMonthKey = period.start.slice(0, 7);
  const reportHref = (tab: "finance" | "time") => withQuery("/app/reports", {
    period: query.period,
    from: query.from,
    to: query.to,
  }, { tab: tab === "finance" ? undefined : tab });

  function scopeHref(nextScope: "business" | "personal") {
    const sp = new URLSearchParams();
    if (query.period) sp.set("period", query.period);
    if (query.from) sp.set("from", query.from);
    if (query.to) sp.set("to", query.to);
    if (query.tab && nextScope === "business") sp.set("tab", query.tab);
    if (nextScope === "personal") sp.set("scope", "personal");
    return `/app/reports?${sp.toString()}`;
  }

  // Compute smart financial insights
  const insights: string[] = [];
  if (income > 0 && previousIncome > 0) {
    const incDiff = Math.round(((income - previousIncome) / previousIncome) * 100);
    if (incDiff > 0) {
      insights.push(t(`Pemasukan naik +${incDiff}% dibandingkan periode lalu.`, `Income increased +${incDiff}% vs previous period.`));
    } else if (incDiff < 0) {
      insights.push(t(`Pemasukan turun ${incDiff}% dibandingkan periode lalu.`, `Income decreased ${incDiff}% vs previous period.`));
    }
  }
  if (topCategories.length > 0 && expenseTotal > 0) {
    const topPct = Math.round((topCategories[0].total / expenseTotal) * 100);
    insights.push(t(`Kategori "${topCategories[0].name}" adalah pengeluaran terbesar (${topPct}% dari total biaya).`, `Category "${topCategories[0].name}" is the largest expense (${topPct}% of total costs).`));
  }
  if (overdueItems.length > 0) {
    insights.push(t(`Terdapat ${overdueItems.length} invoice jatuh tempo (${formatMoney(overdueTotal, baseCurrency)}) yang butuh segera ditagih.`, `${overdueItems.length} invoices are overdue (${formatMoney(overdueTotal, baseCurrency)}) requiring prompt collection.`));
  } else if (receivables.length > 0) {
    insights.push(t(`Seluruh ${receivables.length} invoice yang belum lunas masih dalam masa tenggat yang aman.`, `All ${receivables.length} unpaid invoices are currently within healthy payment terms.`));
  }

  if (activeTab === "time") {
    const sections = [
      [t("Per Klien", "By client"), timeReport.byClient],
      [t("Per Proyek", "By project"), timeReport.byProject],
      [t("Per Tugas", "By task"), timeReport.byTask],
      [t("Per Anggota", "By member"), timeReport.byMember],
    ] as const;
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="app-page-header">
          <div className="min-w-0">
            <h1 className="app-page-title">{t("Laporan", "Reports")}</h1>
            <p className="app-page-description">
              {t(
                "Analisis waktu lintas proyek dan anggota.",
                "Time analysis across projects and members.",
              )}
            </p>
          </div>
          <div className="app-page-actions">
            <ReportControls
              lang={lang}
              preset={period.preset}
              from={period.start}
              to={period.end}
            />
          </div>
        </div>

        {/* Scope Switcher Bar & Business Tabs on same row */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="inline-flex rounded-xl bg-muted/70 p-1 border shadow-xs self-start sm:self-auto">
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg px-3.5 text-xs font-semibold bg-background text-foreground shadow-sm hover:bg-background"
            >
              <Link href={scopeHref("business")}>
                {t("🏢 Bisnis / Tim", "🏢 Business / Team")}
              </Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="h-8 rounded-lg px-3.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <Link href={scopeHref("personal")}>
                {t("👤 Pribadi (50/30/20)", "👤 Personal (50/30/20)")}
              </Link>
            </Button>
          </div>

          <ReportTabs
            active="time"
            financeHref={reportHref("finance")}
            timeHref={reportHref("time")}
            financeLabel={t("Keuangan", "Finance")}
            timeLabel={t("Waktu", "Time")}
          />
        </div>

        <Card className="rounded-xl border shadow-none"><CardHeader className="pb-3"><CardTitle className="text-base">{t("Kinerja Waktu", "Time performance")}</CardTitle><CardDescription className="text-xs">{reportPeriodLabel(period, lang)}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-1">
          {[[t("Total Waktu", "Total Time"), timeReport.summary.totalMinutes], ["Billable", timeReport.summary.billableMinutes], ["Non-billable", timeReport.summary.nonBillableMinutes]].map(([label, minutes]) => <div key={String(label)} className="p-3 rounded-lg bg-muted/40 border"><p className="text-xs text-muted-foreground font-medium">{label}</p><p className="text-xl font-bold tabular-nums mt-0.5">{(Number(minutes) / 60).toFixed(1)}h</p></div>)}
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20"><p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{t("Estimasi Nilai", "Estimated Value")}</p><p className="text-xl font-bold tabular-nums mt-0.5 text-emerald-700 dark:text-emerald-300">{formatMoney(timeReport.summary.billableValue, baseCurrency)}</p></div>
        </CardContent></Card>
        <div className="grid gap-4 md:grid-cols-2">{sections.map(([title, rows]) => <Card key={title} className="rounded-xl border shadow-none"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">{title}</CardTitle></CardHeader><CardContent className="pt-2">{rows.length === 0 ? <p className="text-xs py-4 text-center text-muted-foreground">{t("Belum ada waktu tercatat.", "No tracked time yet.")}</p> : <div className="divide-y text-xs">{rows.slice(0, 10).map(row => <div key={row.id} className="flex justify-between items-center gap-3 py-2.5"><span className="truncate font-medium">{row.name}</span><span className="tabular-nums font-semibold shrink-0">{(row.minutes / 60).toFixed(1)}h</span></div>)}</div>}</CardContent></Card>)}</div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline" size="sm" className="rounded-lg text-xs"><Link href="/app/time/history">{t("Riwayat dan ekspor PDF", "History and PDF export")}</Link></Button><Button asChild size="sm" className="rounded-lg text-xs"><Link href="/app/invoices?tab=uninvoiced">{t("Buat invoice dari waktu", "Invoice tracked time")}</Link></Button></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={BarChart3}
        title={scope === "personal"
          ? t("Laporan Keuangan Pribadi", "Personal Financial Reports")
          : t("Laporan Keuangan Bisnis", "Business Financial Reports")}
        description={scope === "personal"
          ? t(
              "Evaluasi alokasi 50/30/20, tingkat tabungan (savings rate), dan kebiasaan belanja pribadimu.",
              "Evaluate 50/30/20 allocation, savings rate, and personal spending habits.",
            )
          : t(
              "Pantau arus kas, kinerja laba bersih, piutang, dan tren pendapatan bisnismu.",
              "Track cash flow, net profitability, receivables, and revenue trends.",
            )}
        actions={
          <ReportControls
            lang={lang}
            preset={period.preset}
            from={period.start}
            to={period.end}
          />
        }
      />

      {/* Scope Switcher Bar & Business Tabs on same row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-xl bg-muted/70 p-1 border shadow-xs self-start sm:self-auto">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={`h-8 rounded-lg px-3.5 text-xs font-semibold transition-all ${
              scope === "business"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href={scopeHref("business")}>
              {t("🏢 Bisnis / Tim", "🏢 Business / Team")}
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className={`h-8 rounded-lg px-3.5 text-xs font-semibold transition-all ${
              scope === "personal"
                ? "bg-background text-foreground shadow-sm hover:bg-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Link href={scopeHref("personal")}>
              {t("👤 Pribadi (50/30/20)", "👤 Personal (50/30/20)")}
            </Link>
          </Button>
        </div>

        {scope === "business" && (
          <ReportTabs
            active={activeTab}
            financeHref={reportHref("finance")}
            timeHref={reportHref("time")}
            financeLabel={t("Keuangan", "Finance")}
            timeLabel={t("Waktu", "Time")}
          />
        )}
      </div>

      {scope === "personal" ? (
        <PersonalReportSection month={currentMonthKey} t={t} />
      ) : (
        <>
          {missingFxList.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {t(
                `Kurs belum diatur: ${missingFxList.join(", ")}. Angka tersebut tidak dihitung.`,
                `Missing FX rates: ${missingFxList.join(", ")}. Those amounts are excluded.`,
              )}{" "}
              <Link
                href="/app/settings?tab=workspace"
                className="font-medium underline underline-offset-2"
              >
                {t("Atur kurs", "Set rates")}
              </Link>
            </div>
          )}

          {/* 4-KPI Strip: Pemasukan, Pengeluaran, Bersih, Piutang (Aligned Compact Style) */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              {
                label: t("Pemasukan Diterima", "Income Received"),
                value: income,
                previous: previousIncome,
                icon: TrendingUp,
                tone: "text-emerald-600 dark:text-emerald-400",
                iconTone: "text-emerald-500",
              },
              {
                label: t("Biaya Operasional", "Expenses"),
                value: expenseTotal,
                previous: previousExpense,
                icon: TrendingDown,
                tone: "text-rose-600 dark:text-rose-400",
                iconTone: "text-rose-500",
              },
              {
                label: t("Laba Bersih (Net)", "Net Profit"),
                value: net,
                previous: previousNet,
                icon: BarChart3,
                tone: net >= 0 ? "text-blue-600 dark:text-blue-400" : "text-amber-600 dark:text-amber-400",
                iconTone: "text-blue-500",
              },
              {
                label: t("Sisa Piutang", "Outstanding AR"),
                value: unpaidTotal,
                previous: 0,
                icon: Wallet,
                tone: overdueTotal > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground",
                iconTone: "text-violet-500",
                subtitle: overdueTotal > 0 ? `${overdueItems.length} ${t("terlambat", "overdue")}` : `${receivables.length} ${t("invoice aktif", "active invoices")}`,
              },
            ].map((item) => {
              return (
                <Card
                  key={item.label}
                  className="rounded-xl border shadow-none bg-card p-4 space-y-1 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground truncate">
                      {item.label}
                    </span>
                    <item.icon className={`h-4 w-4 ${item.iconTone} shrink-0`} />
                  </div>

                  <p className={`text-xl font-bold tracking-tight tabular-nums truncate ${item.tone}`}>
                    {formatMoney(item.value, baseCurrency)}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-muted-foreground truncate">
                    {item.subtitle ? (
                      <span className="truncate">{item.subtitle}</span>
                    ) : item.value !== 0 || item.previous !== 0 ? (
                      <span className="truncate">{deltaText(item.value, item.previous, lang)}</span>
                    ) : (
                      <span>{t("Periode ini", "This period")}</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Smart Automated Insight Strip */}
          {insights.length > 0 && (
            <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 flex items-start gap-3 text-xs sm:text-sm">
              <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="font-semibold text-foreground">{t("Ringkasan Insight Bisnis", "Business Insight Summary")}</p>
                <div className="space-y-0.5 text-xs text-muted-foreground">
                  {insights.map((ins, idx) => (
                    <p key={idx} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-primary shrink-0" />
                      <span>{ins}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Combined Cash Flow Trend Chart */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">
                    {t("Tren Arus Kas & Margin", "Cash Flow & Margin Trend")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {reportPeriodLabel(period, lang)} · {baseCurrency}
                  </CardDescription>
                </div>
                {income > 0 && (
                  <Badge variant="outline" className="self-start sm:self-auto font-medium text-xs">
                    {t("Margin Keseluruhan", "Overall Margin")}: {Math.round((net / income) * 100)}%
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <IncomeExpenseChart
                points={chartPoints}
                currency={baseCurrency}
                lang={lang}
              />
            </CardContent>
          </Card>

          {/* Breakdown Grid: Income Sources & Largest Expenses with Visual Bar Gauges */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Income Sources */}
            <Card className="rounded-xl border shadow-none bg-card">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <Users className="h-4 w-4 text-emerald-600" />
                      {t("Sumber Pemasukan Terbesar", "Top Income Sources")}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {t("Pembayaran masuk berdasarkan klien", "Payments received by client")}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                    <Link href="/app/invoices">{t("Semua", "View all")}</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {topClients.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t("Belum ada pembayaran masuk pada periode ini.", "No payments received in this period.")}
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {topClients.map((client) => {
                      const pct = income > 0 ? (client.total / income) * 100 : 0;
                      return (
                        <div key={client.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <Link
                              href={`/app/clients/${client.id}`}
                              className="font-semibold text-foreground hover:underline truncate"
                            >
                              {client.name}
                            </Link>
                            <div className="flex items-center gap-2 shrink-0 font-medium">
                              <span className="tabular-nums font-bold text-emerald-600">
                                {formatMoney(client.total, baseCurrency)}
                              </span>
                              <span className="text-muted-foreground w-10 text-right text-[11px]">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          {/* Visual Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {client.count} {t("transaksi pembayaran", "payment transactions")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Largest Expense Categories */}
            <Card className="rounded-xl border shadow-none bg-card">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                      <TagIcon className="h-4 w-4 text-rose-600" />
                      {t("Pengeluaran per Kategori", "Expenses by Category")}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      {t("Alokasi biaya operasional periode ini", "Operating expense allocation")}
                    </CardDescription>
                  </div>
                  <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                    <Link href={`/app/expenses?from=${period.start}&to=${period.end}`}>{t("Semua", "View all")}</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {topCategories.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    {t("Belum ada catatan pengeluaran pada periode ini.", "No expenses recorded in this period.")}
                  </p>
                ) : (
                  <div className="space-y-3.5">
                    {topCategories.map((category) => {
                      const pct = expenseTotal > 0 ? (category.total / expenseTotal) * 100 : 0;
                      return (
                        <div key={category.name} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: category.color ?? "#f43f5e" }}
                              />
                              <span className="font-semibold text-foreground truncate">
                                {category.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 font-medium">
                              <span className="tabular-nums font-bold text-rose-600">
                                {formatMoney(category.total, baseCurrency)}
                              </span>
                              <span className="text-muted-foreground w-10 text-right text-[11px]">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          {/* Visual Progress Bar */}
                          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(100, Math.max(4, pct))}%`,
                                backgroundColor: category.color ?? "#f43f5e",
                              }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {category.count} {t("catatan biaya", "expense entries")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Receivables & Aging Block */}
          <Card className="rounded-xl border shadow-none bg-card">
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3 border-b">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  {t("Status Piutang & Penagihan", "Receivables & Collection Health")}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t(
                    "Monitor invoice yang belum lunas serta keterlambatan pembayaran",
                    "Monitor unpaid invoices and payment delays",
                  )}
                </CardDescription>
              </div>
              <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-lg shrink-0">
                <Link href="/app/invoices?status=overdue">
                  {t("Buka Invoice", "View Invoices")}
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="mb-4 grid grid-cols-3 gap-2.5 rounded-xl bg-muted/40 p-3 border text-center">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t("Total Belum Lunas", "Total Outstanding")}
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold tabular-nums">
                    {formatMoney(unpaidTotal, baseCurrency)}
                  </p>
                </div>
                <div className="border-x border-border/80">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t("Total Terlambat", "Total Overdue")}
                  </p>
                  <p className={`mt-0.5 text-base sm:text-lg font-bold tabular-nums ${overdueTotal > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                    {formatMoney(overdueTotal, baseCurrency)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    {t("Rasio Overdue", "Overdue Ratio")}
                  </p>
                  <p className="mt-0.5 text-base sm:text-lg font-bold tabular-nums">
                    {unpaidTotal > 0 ? `${Math.round((overdueTotal / unpaidTotal) * 100)}%` : "0%"}
                  </p>
                </div>
              </div>

              {overdueItems.length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  {t("Tidak ada invoice yang melewati jatuh tempo. Kondisi piutang sangat sehat!", "No overdue invoices. Receivables are fully healthy!")}
                </p>
              ) : (
                <div className="divide-y text-xs">
                  {overdueItems.slice(0, 5).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/30 px-1 rounded-md transition-colors"
                    >
                      <div className="min-w-0">
                        <Link
                          href={buildInvoiceDetailUrl(item.id, { type: "global" })}
                          className="font-semibold text-foreground hover:underline truncate flex items-center gap-1.5"
                        >
                          <span>{item.invoiceNumber}</span>
                          <span className="text-muted-foreground font-normal">· {item.client}</span>
                        </Link>
                        <p className="text-[11px] font-medium text-rose-600 mt-0.5">
                          {t(
                            `Terlambat ${item.daysOverdue} hari (Jatuh tempo: ${item.dueDate})`,
                            `Overdue ${item.daysOverdue} days (Due: ${item.dueDate})`,
                          )}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-bold tabular-nums text-foreground">
                          {formatMoney(item.remaining, item.currency)}
                        </div>
                        {item.remainingBase !== null &&
                          normalizeCurrency(item.currency) !== baseCurrency && (
                            <div className="text-[10px] text-muted-foreground">
                              ≈ {formatMoney(item.remainingBase, baseCurrency)}
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collapsible Progressive Disclosure for Deep Details */}
          <details className="group overflow-hidden rounded-xl border bg-card shadow-none">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {t("Detail Umur Piutang & Pengeluaran Proyek", "Detailed Aging & Project Expenses")}
              </span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 text-muted-foreground" />
            </summary>
            <div className="space-y-6 border-t p-4">
              <section>
                <h2 className="text-sm font-semibold mb-1">
                  {t("Umur Invoice (Invoice Aging)", "Invoice Aging Breakdown")}
                </h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t(
                    "Rincian invoice belum lunas dikelompokkan berdasarkan umur jatuh tempo.",
                    "Unpaid invoices grouped by aging overdue status.",
                  )}
                </p>
                {receivables.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("Tidak ada piutang aktif.", "No active receivables.")}
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border">
                    <Table className="min-w-[600px] text-xs">
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>{t("Invoice", "Invoice")}</TableHead>
                          <TableHead>{t("Klien", "Client")}</TableHead>
                          <TableHead>{t("Jatuh tempo", "Due date")}</TableHead>
                          <TableHead className="text-right">
                            {t("Status Umur", "Aging Status")}
                          </TableHead>
                          <TableHead className="text-right">
                            {t("Sisa Tagihan", "Remaining")}
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receivables.slice(0, 10).map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Link
                                href={buildInvoiceDetailUrl(item.id, { type: "global" })}
                                className="font-semibold text-foreground hover:underline"
                              >
                                {item.invoiceNumber}
                              </Link>
                            </TableCell>
                            <TableCell>{item.client}</TableCell>
                            <TableCell>{item.dueDate || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Badge
                                variant={
                                  item.daysOverdue > 0 ? "destructive" : "secondary"
                                }
                                className="text-[10px] px-1.5 py-0"
                              >
                                {item.daysOverdue > 0
                                  ? `${item.daysOverdue}h lewat`
                                  : t("Lancar", "Current")}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right tabular-nums font-semibold">
                              {formatMoney(item.remaining, item.currency)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </section>

              <section>
                <h2 className="text-sm font-semibold mb-1">
                  {t("Pengeluaran per Proyek", "Expenses by Project")}
                </h2>
                <p className="mb-3 text-xs text-muted-foreground">
                  {reportPeriodLabel(period, lang)}
                </p>
                {projectExpenses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "Belum ada pengeluaran bertanda proyek pada periode ini.",
                      "No project-tagged expenses in this period.",
                    )}
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border text-xs">
                    {projectExpenses.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center justify-between gap-3 p-3"
                      >
                        <div>
                          <Link
                            href={`/app/projects/${project.id}`}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {project.name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {project.client ?? "—"} · {project.count} {t("transaksi", "transactions")}
                          </p>
                        </div>
                        <span className="font-bold tabular-nums">
                          {formatMoney(project.total, baseCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

function TagIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}
