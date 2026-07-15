import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  clients,
  expenses,
  expenseCategories,
  payments,
  projects,
  expenseRecurring,
} from "@/db/schema";
import { eq, and, sql, desc, gte, inArray } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  BarChart3,
  Wallet,
  ArrowRight,
} from "lucide-react";

type MoneyMap = Record<string, number>;

function addMoney(map: MoneyMap, currency: string, amount: number) {
  const code = (currency || "IDR").toUpperCase();
  map[code] = (map[code] ?? 0) + amount;
}

function moneyEntries(map: MoneyMap): Array<[string, number]> {
  return Object.entries(map)
    .filter(([, v]) => Math.abs(v) > 0.000001)
    .sort(([a], [b]) => {
      if (a === "IDR") return -1;
      if (b === "IDR") return 1;
      return a.localeCompare(b);
    });
}

function renderMoneyLines(
  map: MoneyMap,
  opts: {
    className?: string;
    zero?: string;
    signed?: boolean;
    secondaryClassName?: string;
  } = {},
) {
  const entries = moneyEntries(map);
  if (entries.length === 0) {
    return (
      <span className={opts.className ?? "text-2xl font-semibold text-slate-400"}>
        {opts.zero ?? "—"}
      </span>
    );
  }
  return (
    <div className="space-y-0.5">
      {entries.map(([currency, amount], idx) => {
        const signed =
          opts.signed && amount !== 0
            ? amount > 0
              ? `+${formatMoney(amount, currency)}`
              : `−${formatMoney(Math.abs(amount), currency)}`
            : formatMoney(amount, currency);
        const tone =
          opts.signed && amount !== 0
            ? amount > 0
              ? "text-emerald-600"
              : "text-red-600"
            : "";
        const size =
          idx === 0
            ? opts.className ?? "text-2xl font-semibold"
            : opts.secondaryClassName ?? "text-sm text-slate-600";
        return (
          <div key={currency} className={`${size} tabular-nums ${tone}`.trim()}>
            {signed}
          </div>
        );
      })}
    </div>
  );
}

function monthKeyFromDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(m: string, lang: string) {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, (mo || 1) - 1, 1);
  return d.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
    month: "short",
    year: "numeric",
  });
}

export default async function ReportsPage() {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  await assertWorkspaceMember(db, user.id, ws.id);

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  // ─── Last 6 calendar months window ───
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(monthKeyFromDate(d));
  }
  const windowStart = `${months[0]}-01`;

  // ─── Top clients by revenue (calendar YTD), with paid via payments ───
  const clientInvoiceRows = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      currency: invoices.currency,
      invoiceId: invoices.id,
      total: invoices.total,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        gte(invoices.issueDate, yearStart),
        sql`${invoices.status} <> 'cancelled'`,
      ),
    );

  const clientPaidRows = await db
    .select({
      invoiceId: payments.invoiceId,
      paid: sql<string>`coalesce(sum(${payments.amount}), 0)::text`,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(
      and(eq(invoices.workspaceId, ws.id), gte(invoices.issueDate, yearStart)),
    )
    .groupBy(payments.invoiceId);

  const paidByInvoice = new Map(
    clientPaidRows.map((r) => [r.invoiceId, parseFloat(r.paid ?? "0")]),
  );

  type ClientAgg = {
    clientId: string;
    clientName: string;
    currency: string;
    invoiced: number;
    paid: number;
    unpaid: number;
    invoiceCount: number;
  };
  const clientAgg = new Map<string, ClientAgg>();
  for (const row of clientInvoiceRows) {
    const key = `${row.clientId}::${row.currency}`;
    const inv = parseFloat(row.total ?? "0");
    const paid =
      row.status === "paid"
        ? inv
        : Math.min(inv, paidByInvoice.get(row.invoiceId) ?? 0);
    const unpaid = Math.max(0, inv - paid);
    const cur = clientAgg.get(key) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      currency: row.currency,
      invoiced: 0,
      paid: 0,
      unpaid: 0,
      invoiceCount: 0,
    };
    cur.invoiced += inv;
    cur.paid += paid;
    cur.unpaid += unpaid;
    cur.invoiceCount += 1;
    clientAgg.set(key, cur);
  }
  const clientRows = Array.from(clientAgg.values()).sort(
    (a, b) => b.invoiced - a.invoiced,
  );

  // Collection health per currency (YTD, non-cancelled)
  const collectionByCurrency: Record<
    string,
    { invoiced: number; paid: number }
  > = {};
  for (const c of clientRows) {
    const cur = collectionByCurrency[c.currency] ?? { invoiced: 0, paid: 0 };
    cur.invoiced += c.invoiced;
    cur.paid += c.paid;
    collectionByCurrency[c.currency] = cur;
  }

  // ─── Monthly P&L (last 6 months) ───
  const incomeRows = await db
    .select({
      month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
      currency: invoices.currency,
      total: sql<string>`sum(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        sql`${payments.paidAt} >= ${windowStart}::date`,
      ),
    )
    .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`, invoices.currency);

  const expenseRows = await db
    .select({
      month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.workspaceId, ws.id),
        gte(expenses.date, windowStart),
      ),
    )
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`, expenses.currency);

  const incomeByMonth: Record<string, MoneyMap> = {};
  incomeRows.forEach((r) => {
    if (!incomeByMonth[r.month]) incomeByMonth[r.month] = {};
    addMoney(incomeByMonth[r.month], r.currency, parseFloat(r.total ?? "0"));
  });
  const expensesByMonth: Record<string, MoneyMap> = {};
  expenseRows.forEach((r) => {
    if (!expensesByMonth[r.month]) expensesByMonth[r.month] = {};
    addMoney(expensesByMonth[r.month], r.currency, parseFloat(r.total ?? "0"));
  });

  // Window totals (6 months) — label honestly, not "YTD"
  const windowIncome: MoneyMap = {};
  const windowExpense: MoneyMap = {};
  for (const m of months) {
    for (const [cur, amt] of Object.entries(incomeByMonth[m] ?? {})) {
      addMoney(windowIncome, cur, amt);
    }
    for (const [cur, amt] of Object.entries(expensesByMonth[m] ?? {})) {
      addMoney(windowExpense, cur, amt);
    }
  }
  const windowNet: MoneyMap = {};
  for (const cur of new Set([
    ...Object.keys(windowIncome),
    ...Object.keys(windowExpense),
  ])) {
    windowNet[cur] = (windowIncome[cur] ?? 0) - (windowExpense[cur] ?? 0);
  }

  const activeMonths = months.filter((m) => {
    const inc = moneyEntries(incomeByMonth[m] ?? {}).length > 0;
    const exp = moneyEntries(expensesByMonth[m] ?? {}).length > 0;
    return inc || exp;
  });
  const pnlMonths = activeMonths.length > 0 ? activeMonths : months.slice(-1);
  const pnlMax = Math.max(
    ...pnlMonths.flatMap((m) => [
      ...Object.values(incomeByMonth[m] ?? {}),
      ...Object.values(expensesByMonth[m] ?? {}),
    ]),
    1,
  );

  // ─── Invoice aging (AR = sent/viewed/overdue only; exclude draft/cancelled/paid) ───
  const agingRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientName: clients.name,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      paid: sql<string>`coalesce((
        select sum(${payments.amount}) from ${payments}
        where ${payments.invoiceId} = ${invoices.id}
      ), 0)::text`,
      daysOverdue: sql<number>`case
        when ${invoices.dueDate} is null then 0
        when ${invoices.dueDate} < ${today}::date
          then (${today}::date - ${invoices.dueDate})::int
        else 0
      end`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        inArray(invoices.status, ["sent", "viewed", "overdue"]),
      ),
    )
    .orderBy(invoices.dueDate);

  type Bucket = { count: number; amounts: MoneyMap };
  const emptyBucket = (): Bucket => ({ count: 0, amounts: {} });
  const buckets = {
    current: emptyBucket(),
    days_0_30: emptyBucket(),
    days_31_60: emptyBucket(),
    days_61_90: emptyBucket(),
    days_90_plus: emptyBucket(),
  };

  const overdueItems: Array<{
    id: string;
    invoiceNumber: string;
    client: string;
    remaining: number;
    currency: string;
    dueDate: string;
    daysOverdue: number;
  }> = [];
  const outstanding: MoneyMap = {};
  const overdueTotals: MoneyMap = {};

  for (const r of agingRows) {
    const total = parseFloat(r.total ?? "0");
    const paid = parseFloat(r.paid ?? "0");
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0.000001) continue;

    const od = r.daysOverdue ?? 0;
    let bucket: Bucket;
    if (od === 0) bucket = buckets.current;
    else if (od <= 30) bucket = buckets.days_0_30;
    else if (od <= 60) bucket = buckets.days_31_60;
    else if (od <= 90) bucket = buckets.days_61_90;
    else bucket = buckets.days_90_plus;

    bucket.count += 1;
    addMoney(bucket.amounts, r.currency, remaining);
    addMoney(outstanding, r.currency, remaining);

    if (od > 0) {
      addMoney(overdueTotals, r.currency, remaining);
      overdueItems.push({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        client: r.clientName,
        remaining,
        currency: r.currency,
        dueDate: r.dueDate ?? "",
        daysOverdue: od,
      });
    }
  }

  // Collection rate: prefer IDR if present, else first currency; show multi-line rates
  const collectionRates = Object.entries(collectionByCurrency)
    .filter(([, v]) => v.invoiced > 0)
    .sort(([a], [b]) => {
      if (a === "IDR") return -1;
      if (b === "IDR") return 1;
      return a.localeCompare(b);
    })
    .map(([currency, v]) => ({
      currency,
      rate: Math.round((v.paid / v.invoiced) * 100),
      invoiced: v.invoiced,
      paid: v.paid,
    }));
  const primaryCollection = collectionRates[0];

  // ─── Top expense categories (calendar YTD) ───
  const topCats = await db
    .select({
      name: expenseCategories.name,
      color: expenseCategories.color,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .leftJoin(
      expenseCategories,
      eq(expenseCategories.id, expenses.categoryId),
    )
    .where(
      and(eq(expenses.workspaceId, ws.id), gte(expenses.date, yearStart)),
    )
    .groupBy(expenseCategories.name, expenseCategories.color, expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amount})`))
    .limit(10);

  // ─── Per-project expenses (by currency, no cross-sum) ───
  const projectExpenseRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: clients.name,
      currency: expenses.currency,
      expenseTotal: sql<string>`coalesce(sum(${expenses.amount}), 0)::text`,
      expenseCount: sql<number>`count(${expenses.id})::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .innerJoin(expenses, eq(expenses.projectId, projects.id))
    .where(eq(projects.workspaceId, ws.id))
    .groupBy(projects.id, projects.name, clients.name, expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amount})`));

  type ProjectAgg = {
    id: string;
    name: string;
    clientName: string | null;
    amounts: MoneyMap;
    count: number;
  };
  const projectAgg = new Map<string, ProjectAgg>();
  for (const r of projectExpenseRows) {
    const cur = projectAgg.get(r.id) ?? {
      id: r.id,
      name: r.name,
      clientName: r.clientName,
      amounts: {},
      count: 0,
    };
    addMoney(cur.amounts, r.currency ?? "IDR", parseFloat(r.expenseTotal ?? "0"));
    cur.count += Number(r.expenseCount ?? 0);
    projectAgg.set(r.id, cur);
  }
  const projectRows = Array.from(projectAgg.values()).sort((a, b) => {
    const aSum = Object.values(a.amounts).reduce((s, n) => s + n, 0);
    const bSum = Object.values(b.amounts).reduce((s, n) => s + n, 0);
    return bSum - aSum;
  });

  // ─── Cash flow forecast (overdue + next 3 months) ───
  const fcLimit = new Date();
  fcLimit.setMonth(fcLimit.getMonth() + 3);
  const fcLimitStr = fcLimit.toISOString().slice(0, 10);

  const openInvoiceRows = await db
    .select({
      id: invoices.id,
      currency: invoices.currency,
      total: invoices.total,
      dueDate: invoices.dueDate,
      paid: sql<string>`coalesce((
        select sum(${payments.amount}) from ${payments}
        where ${payments.invoiceId} = ${invoices.id}
      ), 0)::text`,
    })
    .from(invoices)
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        inArray(invoices.status, ["sent", "viewed", "overdue"]),
        sql`${invoices.dueDate} is not null`,
        sql`${invoices.dueDate} <= ${fcLimitStr}`,
      ),
    );

  const recurringRows = await db
    .select()
    .from(expenseRecurring)
    .where(
      and(
        eq(expenseRecurring.workspaceId, ws.id),
        eq(expenseRecurring.isActive, true),
      ),
    );

  const overdueIncome: MoneyMap = {};
  let overdueCount = 0;
  const incomeFc: Record<string, { amounts: MoneyMap; count: number }> = {};

  for (const r of openInvoiceRows) {
    const remaining = Math.max(
      0,
      parseFloat(r.total ?? "0") - parseFloat(r.paid ?? "0"),
    );
    if (remaining <= 0.000001 || !r.dueDate) continue;
    if (r.dueDate < today) {
      addMoney(overdueIncome, r.currency, remaining);
      overdueCount += 1;
    } else {
      const m = r.dueDate.slice(0, 7);
      if (!incomeFc[m]) incomeFc[m] = { amounts: {}, count: 0 };
      addMoney(incomeFc[m].amounts, r.currency, remaining);
      incomeFc[m].count += 1;
    }
  }

  const fcMonths: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    fcMonths.push(monthKeyFromDate(d));
  }

  function recurringForMonth(m: string): MoneyMap {
    const recTotals: MoneyMap = {};
    for (const r of recurringRows) {
      const startMonth = r.startDate.slice(0, 7);
      const endMonth = r.endDate ? r.endDate.slice(0, 7) : null;
      if (startMonth > m) continue;
      if (endMonth && endMonth < m) continue;
      const monthsDiff =
        (new Date(m + "-01").getFullYear() -
          new Date(startMonth + "-01").getFullYear()) *
          12 +
        (new Date(m + "-01").getMonth() -
          new Date(startMonth + "-01").getMonth());
      const applies =
        (r.frequency === "monthly" && monthsDiff >= 0) ||
        (r.frequency === "quarterly" &&
          monthsDiff >= 0 &&
          monthsDiff % 3 === 0) ||
        (r.frequency === "yearly" &&
          monthsDiff >= 0 &&
          monthsDiff % 12 === 0);
      if (applies) addMoney(recTotals, r.currency, parseFloat(r.amount));
    }
    return recTotals;
  }

  const cashFlow = fcMonths.map((m) => {
    const expected = incomeFc[m] ?? { amounts: {}, count: 0 };
    const recurring = recurringForMonth(m);
    const net: MoneyMap = {};
    for (const cur of new Set([
      ...Object.keys(expected.amounts),
      ...Object.keys(recurring),
    ])) {
      net[cur] = (expected.amounts[cur] ?? 0) - (recurring[cur] ?? 0);
    }
    return {
      month: m,
      expectedIncome: expected.amounts,
      expectedCount: expected.count,
      recurringExpenses: recurring,
      net,
    };
  });

  const overdueNet: MoneyMap = { ...overdueIncome }; // no recurring on overdue bucket

  const bucketDefs: Array<{ key: keyof typeof buckets; label: string }> = [
    { key: "current", label: t("Berjalan", "Current") },
    { key: "days_0_30", label: "0–30d" },
    { key: "days_31_60", label: "31–60d" },
    { key: "days_61_90", label: "61–90d" },
    { key: "days_90_plus", label: "90d+" },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Laporan", "Reports")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Pendapatan, aging invoice, pengeluaran, dan proyeksi kas.",
              "Income, invoice aging, expenses, and cash projections.",
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/invoices/new">
              <TrendingUp className="h-4 w-4 mr-1" />
              {t("Invoice baru", "New invoice")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/expenses">
              <Wallet className="h-4 w-4 mr-1" />
              {t("Catat pengeluaran", "Record expense")}
            </Link>
          </Button>
        </div>
      </div>

      {/* Window summary (last 6 months) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Pendapatan 6 bln", "Income 6 mo")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {renderMoneyLines(windowIncome, {
              className: "text-2xl font-semibold text-emerald-700",
              secondaryClassName: "text-sm text-emerald-600",
              zero: formatMoney(0, "IDR"),
            })}
            <p className="text-xs text-slate-500 mt-1">
              {t(
                "Dari pembayaran invoice (6 bulan terakhir)",
                "From invoice payments (last 6 months)",
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Pengeluaran 6 bln", "Expenses 6 mo")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            {renderMoneyLines(windowExpense, {
              className: "text-2xl font-semibold",
              secondaryClassName: "text-sm text-slate-600",
              zero: formatMoney(0, "IDR"),
            })}
            <p className="text-xs text-slate-500 mt-1">
              {t(
                "Semua mata uang ditampilkan terpisah",
                "All currencies shown separately",
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Bersih 6 bln", "Net 6 mo")}
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {renderMoneyLines(windowNet, {
              className: "text-2xl font-semibold",
              secondaryClassName: "text-sm",
              signed: false,
              zero: formatMoney(0, "IDR"),
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Kesehatan penagihan", "Collection health")}
            </CardTitle>
            <AlertCircle
              className={`h-4 w-4 ${
                (primaryCollection?.rate ?? 100) < 70
                  ? "text-red-500"
                  : "text-emerald-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            {collectionRates.length === 0 ? (
              <div className="text-2xl font-semibold text-slate-400">—</div>
            ) : (
              <div className="space-y-1">
                {collectionRates.map((c, idx) => (
                  <div
                    key={c.currency}
                    className={
                      idx === 0
                        ? "text-2xl font-semibold tabular-nums"
                        : "text-sm text-slate-600 tabular-nums"
                    }
                  >
                    {c.rate}%{" "}
                    <span className="text-xs font-normal text-slate-500">
                      {c.currency}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              <div>
                {t("Terlambat", "Overdue")}:{" "}
                {moneyEntries(overdueTotals).length === 0
                  ? "—"
                  : moneyEntries(overdueTotals)
                      .map(([c, a]) => formatMoney(a, c))
                      .join(" · ")}
              </div>
              <div>
                {t("Outstanding AR", "Outstanding AR")}:{" "}
                {moneyEntries(outstanding).length === 0
                  ? "—"
                  : moneyEntries(outstanding)
                      .map(([c, a]) => formatMoney(a, c))
                      .join(" · ")}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Laba Rugi Bulanan", "Monthly P&L")} (
            {t("6 bulan terakhir", "last 6 months")})
          </CardTitle>
          <CardDescription>
            {t(
              "Pembayaran masuk vs pengeluaran — per mata uang, bulan kosong disembunyikan",
              "Incoming payments vs expenses — per currency, empty months hidden",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pnlMonths.every(
            (m) =>
              moneyEntries(incomeByMonth[m] ?? {}).length === 0 &&
              moneyEntries(expensesByMonth[m] ?? {}).length === 0,
          ) ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              {t(
                "Belum ada data laba/rugi di 6 bulan terakhir.",
                "No P&L data in the last 6 months yet.",
              )}
            </p>
          ) : (
            <div className="space-y-4">
              {pnlMonths.map((m) => {
                const inc = incomeByMonth[m] ?? {};
                const exp = expensesByMonth[m] ?? {};
                const currencies = Array.from(
                  new Set([...Object.keys(inc), ...Object.keys(exp)]),
                ).sort((a, b) => {
                  if (a === "IDR") return -1;
                  if (b === "IDR") return 1;
                  return a.localeCompare(b);
                });
                return (
                  <div key={m} className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-500">
                      {monthLabel(m, lang)}
                    </div>
                    {currencies.map((cur) => {
                      const i = inc[cur] ?? 0;
                      const e = exp[cur] ?? 0;
                      return (
                        <div key={`${m}-${cur}`} className="space-y-1 pl-1">
                          {i > 0 && (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 bg-emerald-500 rounded min-w-[2px]"
                                style={{
                                  width: `${Math.max((i / pnlMax) * 100, 0.5)}%`,
                                }}
                              />
                              <span className="text-xs tabular-nums w-36 text-right text-emerald-700 whitespace-nowrap">
                                +{formatMoney(i, cur)}
                              </span>
                            </div>
                          )}
                          {e > 0 && (
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 bg-red-400 rounded min-w-[2px]"
                                style={{
                                  width: `${Math.max((e / pnlMax) * 100, 0.5)}%`,
                                }}
                              />
                              <span className="text-xs tabular-nums w-36 text-right text-red-600 whitespace-nowrap">
                                −{formatMoney(e, cur)}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("Klien teratas", "Top clients")} (YTD)
            </CardTitle>
            <CardDescription>
              {t(
                "Ditagihkan vs sisa piutang (partial payment-aware)",
                "Invoiced vs remaining AR (partial-payment aware)",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {clientRows.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                {t("Belum ada invoice", "No invoices yet")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("Klien", "Client")}</TableHead>
                      <TableHead className="text-right">
                        {t("Ditagihkan", "Invoiced")}
                      </TableHead>
                      <TableHead className="text-right">
                        {t("Sisa", "Remaining")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientRows.slice(0, 10).map((c) => (
                      <TableRow key={`${c.clientId}-${c.currency}`}>
                        <TableCell>
                          <Link
                            href={`/app/clients/${c.clientId}`}
                            className="text-sm font-medium hover:underline"
                          >
                            {c.clientName}
                          </Link>
                          <div className="text-xs text-slate-500">
                            {c.invoiceCount}{" "}
                            {c.invoiceCount === 1
                              ? t("invoice", "invoice")
                              : t("invoice", "invoices")}{" "}
                            · {c.currency}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                          {formatMoney(c.invoiced, c.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                          {c.unpaid > 0.000001 ? (
                            <span className="text-red-600">
                              {formatMoney(c.unpaid, c.currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top expense categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("Pengeluaran terbesar", "Top expenses")} (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topCats.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">
                {t("Belum ada pengeluaran", "No expenses yet")}
              </p>
            ) : (
              <div className="space-y-2">
                {topCats.map((c) => (
                  <div
                    key={`${c.name}-${c.currency}`}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color ?? "#64748b" }}
                      />
                      <span className="text-sm truncate">
                        {c.name ?? t("Tanpa kategori", "Uncategorized")}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {c.currency}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right shrink-0">
                      {c.count}x
                    </span>
                    <span className="text-sm tabular-nums whitespace-nowrap text-right w-32 shrink-0">
                      {formatMoney(c.total, c.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Invoice aging */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {t("Umur Invoice (AR)", "Invoice aging (AR)")}
          </CardTitle>
          <CardDescription>
            {t(
              "Invoice terkirim/dilihat/terlambat. Draft tidak dihitung. Sisa = total − pembayaran parsial.",
              "Sent/viewed/overdue invoices only. Drafts excluded. Remaining = total − partial payments.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {bucketDefs.map(({ key, label }) => {
              const b = buckets[key];
              return (
                <div key={key} className="border rounded-lg p-3">
                  <div className="text-xs text-slate-500">{label}</div>
                  {moneyEntries(b.amounts).length === 0 ? (
                    <div className="text-lg font-semibold tabular-nums text-slate-400">
                      —
                    </div>
                  ) : (
                    moneyEntries(b.amounts).map(([cur, amt], idx) => (
                      <div
                        key={cur}
                        className={
                          idx === 0
                            ? "text-lg font-semibold tabular-nums whitespace-nowrap"
                            : "text-sm tabular-nums text-slate-600 whitespace-nowrap"
                        }
                      >
                        {formatMoney(amt, cur)}
                      </div>
                    ))
                  )}
                  <div className="text-xs text-slate-500">
                    {b.count}{" "}
                    {b.count === 1
                      ? t("invoice", "invoice")
                      : t("invoice", "invoices")}
                  </div>
                </div>
              );
            })}
          </div>

          {overdueItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-2 text-center">
              {t("Tidak ada invoice terlambat", "No overdue invoices")} 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Invoice", "Invoice")}</TableHead>
                    <TableHead>{t("Klien", "Client")}</TableHead>
                    <TableHead>{t("Jatuh Tempo", "Due Date")}</TableHead>
                    <TableHead className="text-right">
                      {t("Terlambat", "Overdue")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("Sisa", "Remaining")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdueItems.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Link
                          href={`/app/invoices/${i.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {i.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{i.client}</TableCell>
                      <TableCell className="text-xs text-slate-500 tabular-nums">
                        {i.dueDate}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            i.daysOverdue > 60 ? "destructive" : "secondary"
                          }
                        >
                          {i.daysOverdue}d
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium whitespace-nowrap">
                        {formatMoney(i.remaining, i.currency)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cash flow forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Proyeksi arus kas", "Cash flow forecast")}
          </CardTitle>
          <CardDescription>
            {t(
              "Piutang terlambat + invoice jatuh tempo 3 bulan ke depan + pengeluaran rutin. Sisa piutang partial-payment aware.",
              "Overdue AR + invoices due in next 3 months + recurring expenses. Remaining AR is partial-payment aware.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            {/* Overdue bucket */}
            <div className="border rounded-lg p-4 space-y-2 border-amber-200 bg-amber-50/40">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {t("Sudah terlambat", "Already overdue")}
                </span>
                {overdueCount > 0 && (
                  <span className="text-xs text-slate-500">
                    {overdueCount} inv
                  </span>
                )}
              </div>
              <div className="space-y-1 text-sm">
                {moneyEntries(overdueIncome).length === 0 ? (
                  <div className="text-slate-400">—</div>
                ) : (
                  moneyEntries(overdueIncome).map(([cur, amt]) => (
                    <div key={cur} className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        {t("Masuk", "In")} {cur}
                      </span>
                      <span className="tabular-nums text-emerald-700 whitespace-nowrap">
                        +{formatMoney(amt, cur)}
                      </span>
                    </div>
                  ))
                )}
                <div className="flex justify-between border-t pt-1 font-semibold gap-2">
                  <span>{t("Net", "Net")}</span>
                  <span className="tabular-nums text-right">
                    {moneyEntries(overdueNet).length === 0
                      ? "—"
                      : moneyEntries(overdueNet)
                          .map(([c, a]) => formatMoney(a, c))
                          .join(" · ")}
                  </span>
                </div>
              </div>
            </div>

            {cashFlow.map((cf) => (
              <div key={cf.month} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {monthLabel(cf.month, lang)}
                  </span>
                  {cf.expectedCount > 0 && (
                    <span className="text-xs text-slate-500">
                      {cf.expectedCount} inv
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-sm">
                  {moneyEntries(cf.expectedIncome).length === 0 &&
                  moneyEntries(cf.recurringExpenses).length === 0 ? (
                    <div className="text-slate-400 text-xs">
                      {t("Tidak ada proyeksi", "No projection")}
                    </div>
                  ) : null}
                  {moneyEntries(cf.expectedIncome).map(([cur, amt]) => (
                    <div key={`in-${cur}`} className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        {t("Masuk", "In")} {cur}
                      </span>
                      <span className="tabular-nums text-emerald-700 whitespace-nowrap">
                        +{formatMoney(amt, cur)}
                      </span>
                    </div>
                  ))}
                  {moneyEntries(cf.recurringExpenses).map(([cur, amt]) => (
                    <div key={`out-${cur}`} className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        {t("Rutin", "Recurring")} {cur}
                      </span>
                      <span className="tabular-nums text-red-600 whitespace-nowrap">
                        −{formatMoney(amt, cur)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-1 font-semibold gap-2">
                    <span>{t("Net", "Net")}</span>
                    <span className="tabular-nums text-right">
                      {moneyEntries(cf.net).length === 0
                        ? "—"
                        : moneyEntries(cf.net).map(([c, a]) => (
                            <div
                              key={c}
                              className={
                                a >= 0 ? "text-emerald-600" : "text-red-600"
                              }
                            >
                              {formatMoney(a, c)}
                            </div>
                          ))}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {recurringRows.length === 0 && (
            <p className="text-xs text-slate-500 mt-3">
              {t(
                "Belum ada pengeluaran rutin. Tambahkan di Pengeluaran untuk proyeksi lebih akurat.",
                "No recurring expenses. Add them in Expenses for more accurate projections.",
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-project expenses */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Pengeluaran per proyek", "Expenses per project")}
          </CardTitle>
          <CardDescription>
            {t(
              "Hanya pengeluaran yang ditandai ke proyek. Mata uang ditampilkan terpisah (tidak digabung).",
              "Only expenses tagged to a project. Currencies shown separately (never mixed).",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectRows.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">
              {t(
                "Belum ada pengeluaran bertanda proyek",
                "No project-tagged expenses yet",
              )}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("Proyek", "Project")}</TableHead>
                    <TableHead>{t("Klien", "Client")}</TableHead>
                    <TableHead className="text-right">
                      {t("Pengeluaran", "Expenses")}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projectRows.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link
                          href={`/app/projects/${p.id}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {p.count}x
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {p.clientName ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="space-y-0.5">
                          {moneyEntries(p.amounts).map(([cur, amt]) => (
                            <div
                              key={cur}
                              className="tabular-nums whitespace-nowrap"
                            >
                              {formatMoney(amt, cur)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-7"
                        >
                          <Link href={`/app/projects/${p.id}`}>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
