import { headers } from "next/headers";
import Link from "next/link";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";
import { and, eq, gte, inArray, lte, sql } from "drizzle-orm";
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  TrendingDown,
  TrendingUp,
  Users,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      ? "No previous-period comparison"
      : "Belum ada pembanding periode lalu";
  const percent = Math.round(((current - previous) / Math.abs(previous)) * 100);
  if (percent === 0)
    return lang === "en"
      ? "Same as previous period"
      : "Sama dengan periode lalu";
  return `${percent > 0 ? "+" : "−"}${Math.abs(percent)}% ${lang === "en" ? "vs previous period" : "dari periode lalu"}`;
}

function ReportTabs({ active, financeHref, timeHref, financeLabel, timeLabel }: { active: "finance" | "time"; financeHref: string; timeHref: string; financeLabel: string; timeLabel: string }) {
  return (
    <StatusFilterTabs
      activeValue={active}
      hideEmpty={false}
      listClassName="w-full sm:w-auto"
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
  searchParams: Promise<{ tab?: string; period?: string; from?: string; to?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const query = await searchParams;
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
  const reportHref = (tab: "finance" | "time") => withQuery("/app/reports", {
    period: query.period,
    from: query.from,
    to: query.to,
  }, { tab: tab === "finance" ? undefined : tab });

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
          <div className="min-w-0"><h1 className="app-page-title">{t("Laporan", "Reports")}</h1><p className="app-page-description">{t("Analisis waktu lintas proyek dan anggota.", "Time analysis across projects and members.")}</p></div>
          <ReportControls lang={lang} preset={period.preset} from={period.start} to={period.end} />
        </div>
        <ReportTabs active="time" financeHref={reportHref("finance")} timeHref={reportHref("time")} financeLabel={t("Keuangan", "Finance")} timeLabel={t("Waktu", "Time")} />
        <Card><CardHeader><CardTitle>{t("Kinerja Waktu", "Time performance")}</CardTitle><CardDescription>{reportPeriodLabel(period, lang)}</CardDescription></CardHeader><CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[[t("Total", "Total"), timeReport.summary.totalMinutes], ["Billable", timeReport.summary.billableMinutes], ["Non-billable", timeReport.summary.nonBillableMinutes]].map(([label, minutes]) => <div key={String(label)}><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold tabular-nums">{(Number(minutes) / 60).toFixed(1)}h</p></div>)}
          <div><p className="text-xs text-muted-foreground">{t("Estimasi nilai", "Estimated value")}</p><p className="text-xl font-semibold tabular-nums">{formatMoney(timeReport.summary.billableValue, baseCurrency)}</p></div>
        </CardContent></Card>
        <div className="grid gap-4 md:grid-cols-2">{sections.map(([title, rows]) => <Card key={title}><CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader><CardContent>{rows.length === 0 ? <p className="text-sm text-muted-foreground">{t("Belum ada waktu tercatat.", "No tracked time yet.")}</p> : <div className="divide-y">{rows.slice(0, 10).map(row => <div key={row.id} className="flex justify-between gap-3 py-2 text-sm"><span className="truncate">{row.name}</span><span className="tabular-nums">{(row.minutes / 60).toFixed(1)}h</span></div>)}</div>}</CardContent></Card>)}</div>
        <div className="flex flex-wrap gap-2"><Button asChild variant="outline"><Link href="/app/time/history">{t("Riwayat dan ekspor PDF", "History and PDF export")}</Link></Button><Button asChild><Link href="/app/invoices?tab=uninvoiced">{t("Buat invoice dari waktu", "Invoice tracked time")}</Link></Button></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Laporan", "Reports")}</h1>
          <p className="app-page-description">
            {t(
              "Ringkasan pemasukan dan pengeluaran bisnismu.",
              "A summary of your business income and expenses.",
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

      <ReportTabs active="finance" financeHref={reportHref("finance")} timeHref={reportHref("time")} financeLabel={t("Keuangan", "Finance")} timeLabel={t("Waktu", "Time")} />

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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {[
          {
            label: t("Pemasukan", "Income"),
            value: income,
            previous: previousIncome,
            icon: TrendingUp,
            tone: "text-emerald-600",
          },
          {
            label: t("Pengeluaran", "Expenses"),
            value: expenseTotal,
            previous: previousExpense,
            icon: TrendingDown,
            tone: "text-red-600",
          },
          {
            label: t("Bersih", "Net"),
            value: net,
            previous: previousNet,
            icon: BarChart3,
            tone: net >= 0 ? "text-emerald-600" : "text-red-600",
          },
        ].map((item) => {
          const hasValue = item.value !== 0;
          return (
          <Card
            key={item.label}
            className={item.label === t("Bersih", "Net") ? "col-span-2 border-primary/20 bg-primary/[0.03] md:col-span-1" : undefined}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.label}
              </CardTitle>
              <item.icon className={`h-4 w-4 ${hasValue ? item.tone : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div
                className={`text-xl font-semibold tabular-nums sm:text-2xl ${hasValue ? item.tone : "text-slate-700"}`}
              >
                {formatMoney(item.value, baseCurrency)}
              </div>
              {(item.value !== 0 || item.previous !== 0) && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {deltaText(item.value, item.previous, lang)}
                </p>
              )}
              {item.label === t("Bersih", "Net") && income > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t("Margin", "Margin")} {Math.round((net / income) * 100)}%
                </p>
              )}
            </CardContent>
          </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Pemasukan vs pengeluaran", "Income vs expenses")}
          </CardTitle>
          <CardDescription>
            {reportPeriodLabel(period, lang)} · {baseCurrency}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IncomeExpenseChart
            points={chartPoints}
            currency={baseCurrency}
            lang={lang}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {t("Sumber pemasukan", "Income sources")}
            </CardTitle>
            <CardDescription>
              {t(
                "Pembayaran diterima pada periode ini",
                "Payments received in this period",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topClients.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("Belum ada pembayaran masuk.", "No payments received yet.")}
              </p>
            ) : (
              <div className="divide-y">
                {topClients.map((client) => (
                  <div
                    key={client.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/app/clients/${client.id}`}
                        className="font-medium hover:underline"
                      >
                        {client.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {client.count} {t("pembayaran", "payments")}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoney(client.total, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link href="/app/invoices">
                {t("Lihat semua pemasukan", "View all income")}
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Pengeluaran terbesar", "Largest expenses")}
            </CardTitle>
            <CardDescription>
              {t(
                "Berdasarkan kategori pada periode ini",
                "By category in this period",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("Belum ada pengeluaran.", "No expenses yet.")}
              </p>
            ) : (
              <div className="divide-y">
                {topCategories.map((category) => (
                  <div
                    key={category.name}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <i
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor: category.color ?? "#64748b",
                          }}
                        />
                        <span className="truncate font-medium">
                          {category.name}
                        </span>
                      </div>
                      <p className="ml-4 text-xs text-muted-foreground">
                        {expenseTotal > 0
                          ? Math.round((category.total / expenseTotal) * 100)
                          : 0}
                        % {t("dari pengeluaran", "of expenses")}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium tabular-nums">
                      {formatMoney(category.total, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Button asChild variant="link" className="mt-2 h-auto px-0">
              <Link
                href={`/app/expenses?from=${period.start}&to=${period.end}`}
              >
                {t("Lihat semua pengeluaran", "View all expenses")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card><CardHeader><CardTitle>{t("Kinerja Waktu", "Time performance")}</CardTitle><CardDescription>{reportPeriodLabel(period, lang)}</CardDescription></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">{t("Total", "Total")}</p><p className="font-semibold">{(timeReport.summary.totalMinutes/60).toFixed(1)}h</p></div><div><p className="text-xs text-muted-foreground">{t("Billable", "Billable")}</p><p className="font-semibold">{(timeReport.summary.billableMinutes/60).toFixed(1)}h</p></div><div><p className="text-xs text-muted-foreground">{t("Non-billable", "Non-billable")}</p><p className="font-semibold">{(timeReport.summary.nonBillableMinutes/60).toFixed(1)}h</p></div><div><p className="text-xs text-muted-foreground">{t("Estimasi nilai", "Estimated value")}</p><p className="font-semibold">{formatMoney(timeReport.summary.billableValue, baseCurrency)}</p></div></div><div className="grid gap-4 lg:grid-cols-3">{[[t("Per Proyek", "By project"),timeReport.byProject],[t("Per Tugas", "By task"),timeReport.byTask],[t("Per Anggota", "By member"),timeReport.byMember]].map(([title,rows])=><div key={title as string}><h3 className="mb-2 text-sm font-semibold">{title as string}</h3><div className="divide-y rounded-lg border">{(rows as typeof timeReport.byProject).slice(0,10).map(row=><div key={row.id} className="flex justify-between gap-2 p-2 text-sm"><span className="truncate">{row.name}</span><span className="tabular-nums">{(row.minutes/60).toFixed(1)}h</span></div>)}</div></div>)}</div></CardContent></Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4" />
              {t("Piutang perlu ditagih", "Receivables requiring attention")}
            </CardTitle>
            <CardDescription>
              {t(
                "Invoice belum lunas sampai hari ini",
                "Invoices unpaid as of today",
              )}
            </CardDescription>
          </div>
          <Button asChild variant="link" className="h-auto shrink-0 p-0">
            <Link href="/app/invoices?status=overdue">
              {t("Lihat semua invoice", "View all invoices")}
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">
                {t("Belum dibayar", "Unpaid")}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {formatMoney(unpaidTotal, baseCurrency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("Terlambat", "Overdue")}
              </p>
              <p className="mt-1 text-lg font-semibold text-red-600 tabular-nums">
                {formatMoney(overdueTotal, baseCurrency)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">
                {t("Invoice", "Invoices")}
              </p>
              <p className="mt-1 text-lg font-semibold">{receivables.length}</p>
            </div>
          </div>
          {overdueItems.length === 0 ? (
            <p className="border-t py-4 text-sm text-muted-foreground">
              {t("Tidak ada invoice terlambat.", "No overdue invoices.")}
            </p>
          ) : (
            <div className="divide-y border-t">
              {overdueItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={buildInvoiceDetailUrl(item.id, { type: "global" })}
                      className="font-medium hover:underline"
                    >
                      {item.invoiceNumber} · {item.client}
                    </Link>
                    <p className="text-xs text-red-600">
                      {t(
                        `Terlambat ${item.daysOverdue} hari`,
                        `${item.daysOverdue} days overdue`,
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-medium tabular-nums">
                      {formatMoney(item.remaining, item.currency)}
                    </div>
                    {item.remainingBase !== null &&
                      normalizeCurrency(item.currency) !== baseCurrency && (
                        <div className="text-xs text-muted-foreground">
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

      <details className="group overflow-hidden rounded-lg border bg-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 py-3 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          <span>{t("Analisis lainnya", "Other analysis")}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-6 border-t p-4">
          <section>
            <h2 className="mb-1 font-semibold">
              {t("Umur invoice", "Invoice aging")}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {t(
                "Rincian invoice belum dibayar berdasarkan keterlambatan.",
                "Unpaid invoices grouped by age.",
              )}
            </p>
            {receivables.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Tidak ada piutang aktif.", "No active receivables.")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Invoice", "Invoice")}</TableHead>
                      <TableHead>{t("Klien", "Client")}</TableHead>
                      <TableHead>{t("Jatuh tempo", "Due date")}</TableHead>
                      <TableHead className="text-right">
                        {t("Umur", "Age")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("Sisa", "Remaining")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receivables.slice(0, 10).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Link
                            href={buildInvoiceDetailUrl(item.id, { type: "global" })}
                            className="font-medium hover:underline"
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
                          >
                            {item.daysOverdue > 0
                              ? `${item.daysOverdue}d`
                              : t("Berjalan", "Current")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
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
            <h2 className="mb-1 font-semibold">
              {t("Pengeluaran per proyek", "Expenses by project")}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {reportPeriodLabel(period, lang)}
            </p>
            {projectExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(
                  "Belum ada pengeluaran bertanda proyek.",
                  "No project-tagged expenses yet.",
                )}
              </p>
            ) : (
              <div className="divide-y rounded-lg border">
                {projectExpenses.map((project) => (
                  <div
                    key={project.id}
                    className="flex items-center justify-between gap-3 p-3"
                  >
                    <div>
                      <Link
                        href={`/app/projects/${project.id}`}
                        className="font-medium hover:underline"
                      >
                        {project.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {project.client ?? "—"} · {project.count}x
                      </p>
                    </div>
                    <span className="font-medium tabular-nums">
                      {formatMoney(project.total, baseCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-1 font-semibold">
              {t("Proyeksi arus kas", "Cash flow forecast")}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t(
                "Proyeksi detail disederhanakan. Piutang aktif di atas menjadi dasar pemasukan yang masih mungkin diterima.",
                "Detailed forecasting is simplified. Active receivables above represent income that may still be collected.",
              )}
            </p>
          </section>
        </div>
      </details>
    </div>
  );
}
