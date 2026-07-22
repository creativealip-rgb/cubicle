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
  workspaceCurrencyRates,
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
  buildRateMap,
  convertToBase,
  normalizeCurrency,
  type RateMap,
} from "@/lib/currency-base";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  BarChart3,
  Wallet,
  ArrowRight,
} from "lucide-react";

function renderBaseMoney(
  amount: number,
  baseCurrency: string,
  opts: {
    className?: string;
    zero?: string;
    signed?: boolean;
  } = {},
) {
  if (!Number.isFinite(amount) || Math.abs(amount) < 0.000001) {
    return (
      <span className={opts.className ?? "text-2xl font-semibold text-slate-400"}>
        {opts.zero ?? formatMoney(0, baseCurrency)}
      </span>
    );
  }
  const signed =
    opts.signed && amount !== 0
      ? amount > 0
        ? `+${formatMoney(amount, baseCurrency)}`
        : `−${formatMoney(Math.abs(amount), baseCurrency)}`
      : formatMoney(amount, baseCurrency);
  const tone =
    opts.signed && amount !== 0
      ? amount > 0
        ? "text-emerald-600"
        : "text-red-600"
      : "";
  return (
    <div className={`${opts.className ?? "text-2xl font-semibold"} tabular-nums ${tone}`.trim()}>
      {signed}
    </div>
  );
}

function trackMissing(
  missing: Set<string>,
  currency: string,
  amount: number,
  baseCurrency: string,
  rates: RateMap,
): number | null {
  const converted = convertToBase(amount, currency, baseCurrency, rates);
  if (converted === null) {
    const from = normalizeCurrency(currency);
    if (from !== normalizeCurrency(baseCurrency)) missing.add(from);
    return null;
  }
  return converted;
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
  const baseCurrency = normalizeCurrency(ws.defaultCurrency || "IDR");
  const rateRows = await db
    .select({
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, ws.id));
  const rateMap = buildRateMap(rateRows);
  const missingFx = new Set<string>();

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
    invoiced: number;
    paid: number;
    unpaid: number;
    invoiceCount: number;
  };
  const clientAgg = new Map<string, ClientAgg>();
  for (const row of clientInvoiceRows) {
    const invRaw = parseFloat(row.total ?? "0");
    const paidRaw =
      row.status === "paid"
        ? invRaw
        : Math.min(invRaw, paidByInvoice.get(row.invoiceId) ?? 0);
    const unpaidRaw = Math.max(0, invRaw - paidRaw);
    const inv = trackMissing(missingFx, row.currency, invRaw, baseCurrency, rateMap);
    const paid = trackMissing(missingFx, row.currency, paidRaw, baseCurrency, rateMap);
    const unpaid = trackMissing(missingFx, row.currency, unpaidRaw, baseCurrency, rateMap);
    if (inv === null && paid === null && unpaid === null) continue;
    const cur = clientAgg.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      invoiced: 0,
      paid: 0,
      unpaid: 0,
      invoiceCount: 0,
    };
    cur.invoiced += inv ?? 0;
    cur.paid += paid ?? 0;
    cur.unpaid += unpaid ?? 0;
    cur.invoiceCount += 1;
    clientAgg.set(row.clientId, cur);
  }
  const clientRows = Array.from(clientAgg.values()).sort(
    (a, b) => b.invoiced - a.invoiced,
  );

  // Collection health in base currency (YTD, non-cancelled)
  let collectionInvoiced = 0;
  let collectionPaid = 0;
  for (const c of clientRows) {
    collectionInvoiced += c.invoiced;
    collectionPaid += c.paid;
  }
  const collectionRate =
    collectionInvoiced > 0 ? Math.round((collectionPaid / collectionInvoiced) * 100) : null;

  // ─── Monthly P&L (last 6 months) — convert to base ───
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

  const incomeByMonth: Record<string, number> = {};
  incomeRows.forEach((r) => {
    const converted = trackMissing(
      missingFx,
      r.currency,
      parseFloat(r.total ?? "0"),
      baseCurrency,
      rateMap,
    );
    if (converted === null) return;
    incomeByMonth[r.month] = (incomeByMonth[r.month] ?? 0) + converted;
  });
  const expensesByMonth: Record<string, number> = {};
  expenseRows.forEach((r) => {
    const converted = trackMissing(
      missingFx,
      r.currency,
      parseFloat(r.total ?? "0"),
      baseCurrency,
      rateMap,
    );
    if (converted === null) return;
    expensesByMonth[r.month] = (expensesByMonth[r.month] ?? 0) + converted;
  });

  // Window totals (6 months) in base
  let windowIncome = 0;
  let windowExpense = 0;
  for (const m of months) {
    windowIncome += incomeByMonth[m] ?? 0;
    windowExpense += expensesByMonth[m] ?? 0;
  }
  const windowNet = windowIncome - windowExpense;

  const activeMonths = months.filter((m) => {
    return (incomeByMonth[m] ?? 0) > 0 || (expensesByMonth[m] ?? 0) > 0;
  });
  const pnlMonths = activeMonths.length > 0 ? activeMonths : months.slice(-1);
  const pnlMax = Math.max(
    ...pnlMonths.flatMap((m) => [incomeByMonth[m] ?? 0, expensesByMonth[m] ?? 0]),
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

  type Bucket = { count: number; amount: number };
  const emptyBucket = (): Bucket => ({ count: 0, amount: 0 });
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
    remainingBase: number | null;
    currency: string;
    dueDate: string;
    daysOverdue: number;
  }> = [];
  let outstanding = 0;
  let overdueTotals = 0;

  for (const r of agingRows) {
    const total = parseFloat(r.total ?? "0");
    const paid = parseFloat(r.paid ?? "0");
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0.000001) continue;

    const remainingBase = trackMissing(
      missingFx,
      r.currency,
      remaining,
      baseCurrency,
      rateMap,
    );

    const od = r.daysOverdue ?? 0;
    let bucket: Bucket;
    if (od === 0) bucket = buckets.current;
    else if (od <= 30) bucket = buckets.days_0_30;
    else if (od <= 60) bucket = buckets.days_31_60;
    else if (od <= 90) bucket = buckets.days_61_90;
    else bucket = buckets.days_90_plus;

    bucket.count += 1;
    if (remainingBase !== null) {
      bucket.amount += remainingBase;
      outstanding += remainingBase;
    }

    if (od > 0) {
      if (remainingBase !== null) overdueTotals += remainingBase;
      overdueItems.push({
        id: r.id,
        invoiceNumber: r.invoiceNumber,
        client: r.clientName,
        remaining,
        remainingBase,
        currency: r.currency,
        dueDate: r.dueDate ?? "",
        daysOverdue: od,
      });
    }
  }

  // ─── Top expense categories (calendar YTD) — base currency ───
  const topCatRows = await db
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
    .orderBy(desc(sql`sum(${expenses.amount})`));

  type CatAgg = { name: string; color: string | null; total: number; count: number };
  const catAgg = new Map<string, CatAgg>();
  for (const c of topCatRows) {
    const converted = trackMissing(
      missingFx,
      c.currency,
      parseFloat(c.total ?? "0"),
      baseCurrency,
      rateMap,
    );
    if (converted === null) continue;
    const key = c.name ?? "__uncat__";
    const cur = catAgg.get(key) ?? {
      name: c.name ?? t("Tanpa kategori", "Uncategorized"),
      color: c.color,
      total: 0,
      count: 0,
    };
    cur.total += converted;
    cur.count += Number(c.count ?? 0);
    if (!cur.color && c.color) cur.color = c.color;
    catAgg.set(key, cur);
  }
  const topCats = Array.from(catAgg.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // ─── Per-project expenses (base currency) ───
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
    amount: number;
    count: number;
  };
  const projectAgg = new Map<string, ProjectAgg>();
  for (const r of projectExpenseRows) {
    const converted = trackMissing(
      missingFx,
      r.currency ?? "IDR",
      parseFloat(r.expenseTotal ?? "0"),
      baseCurrency,
      rateMap,
    );
    if (converted === null) continue;
    const cur = projectAgg.get(r.id) ?? {
      id: r.id,
      name: r.name,
      clientName: r.clientName,
      amount: 0,
      count: 0,
    };
    cur.amount += converted;
    cur.count += Number(r.expenseCount ?? 0);
    projectAgg.set(r.id, cur);
  }
  const projectRows = Array.from(projectAgg.values()).sort((a, b) => b.amount - a.amount);

  // ─── Cash flow forecast (overdue + next 3 months) — base currency ───
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

  let overdueIncome = 0;
  let overdueCount = 0;
  const incomeFc: Record<string, { amount: number; count: number }> = {};

  for (const r of openInvoiceRows) {
    const remaining = Math.max(
      0,
      parseFloat(r.total ?? "0") - parseFloat(r.paid ?? "0"),
    );
    if (remaining <= 0.000001 || !r.dueDate) continue;
    const remainingBase = trackMissing(
      missingFx,
      r.currency,
      remaining,
      baseCurrency,
      rateMap,
    );
    if (remainingBase === null) continue;
    if (r.dueDate < today) {
      overdueIncome += remainingBase;
      overdueCount += 1;
    } else {
      const m = r.dueDate.slice(0, 7);
      if (!incomeFc[m]) incomeFc[m] = { amount: 0, count: 0 };
      incomeFc[m].amount += remainingBase;
      incomeFc[m].count += 1;
    }
  }

  const fcMonths: string[] = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    fcMonths.push(monthKeyFromDate(d));
  }

  function recurringForMonth(m: string): number {
    let recTotal = 0;
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
      if (!applies) continue;
      const converted = trackMissing(
        missingFx,
        r.currency,
        parseFloat(r.amount),
        baseCurrency,
        rateMap,
      );
      if (converted !== null) recTotal += converted;
    }
    return recTotal;
  }

  const cashFlow = fcMonths.map((m) => {
    const expected = incomeFc[m] ?? { amount: 0, count: 0 };
    const recurring = recurringForMonth(m);
    return {
      month: m,
      expectedIncome: expected.amount,
      expectedCount: expected.count,
      recurringExpenses: recurring,
      net: expected.amount - recurring,
    };
  });

  const overdueNet = overdueIncome; // no recurring on overdue bucket
  const missingFxList = Array.from(missingFx).sort();

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
              `Ringkasan finance setara ${baseCurrency} (kurs manual workspace).`,
              `Finance summaries in ${baseCurrency} (workspace manual FX rates).`,
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

      {missingFxList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(
            `Kurs belum di-set: ${missingFxList.join(", ")}. Angka currency itu di-skip di ringkasan. `,
            `Missing FX rates: ${missingFxList.join(", ")}. Those currencies are skipped in summaries. `,
          )}
          <Link href="/app/settings?tab=workspace" className="underline underline-offset-2 font-medium">
            {t("Atur di Settings", "Set in Settings")}
          </Link>
        </div>
      )}

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
            {renderBaseMoney(windowIncome, baseCurrency, {
              className: "text-2xl font-semibold text-emerald-700",
              zero: formatMoney(0, baseCurrency),
            })}
            <p className="text-xs text-slate-500 mt-1">
              {t(
                `Dari pembayaran invoice · setara ${baseCurrency}`,
                `From invoice payments · equiv. ${baseCurrency}`,
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
            {renderBaseMoney(windowExpense, baseCurrency, {
              className: "text-2xl font-semibold",
              zero: formatMoney(0, baseCurrency),
            })}
            <p className="text-xs text-slate-500 mt-1">
              {t(
                `Semua currency dikonversi ke ${baseCurrency}`,
                `All currencies converted to ${baseCurrency}`,
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
            {renderBaseMoney(windowNet, baseCurrency, {
              className: `text-2xl font-semibold ${windowNet >= 0 ? "text-emerald-600" : "text-red-600"}`,
              zero: formatMoney(0, baseCurrency),
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
                (collectionRate ?? 100) < 70 ? "text-red-500" : "text-emerald-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            {collectionRate === null ? (
              <div className="text-2xl font-semibold text-slate-400">—</div>
            ) : (
              <div className="text-2xl font-semibold tabular-nums">
                {collectionRate}%
                <span className="text-xs font-normal text-slate-500 ml-1">
                  {baseCurrency}
                </span>
              </div>
            )}
            <div className="text-xs text-slate-500 mt-1 space-y-0.5">
              <div>
                {t("Terlambat", "Overdue")}:{" "}
                {overdueTotals > 0.000001
                  ? formatMoney(overdueTotals, baseCurrency)
                  : "—"}
              </div>
              <div>
                {t("Outstanding AR", "Outstanding AR")}:{" "}
                {outstanding > 0.000001
                  ? formatMoney(outstanding, baseCurrency)
                  : "—"}
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
              `Pembayaran masuk vs pengeluaran — setara ${baseCurrency}, bulan kosong disembunyikan`,
              `Incoming payments vs expenses — equiv. ${baseCurrency}, empty months hidden`,
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pnlMonths.every(
            (m) => (incomeByMonth[m] ?? 0) === 0 && (expensesByMonth[m] ?? 0) === 0,
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
                const i = incomeByMonth[m] ?? 0;
                const e = expensesByMonth[m] ?? 0;
                return (
                  <div key={m} className="space-y-1.5">
                    <div className="text-xs font-medium text-slate-500">
                      {monthLabel(m, lang)}
                    </div>
                    <div className="space-y-1 pl-1">
                      {i > 0 && (
                        <div className="flex items-center gap-2">
                          <div
                            className="h-3 bg-emerald-500 rounded min-w-[2px]"
                            style={{
                              width: `${Math.max((i / pnlMax) * 100, 0.5)}%`,
                            }}
                          />
                          <span className="text-xs tabular-nums w-36 text-right text-emerald-700 whitespace-nowrap">
                            +{formatMoney(i, baseCurrency)}
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
                            −{formatMoney(e, baseCurrency)}
                          </span>
                        </div>
                      )}
                    </div>
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
                `Ditagihkan vs sisa piutang setara ${baseCurrency} (partial payment-aware)`,
                `Invoiced vs remaining AR in ${baseCurrency} (partial-payment aware)`,
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
                      <TableRow key={c.clientId}>
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
                            · {baseCurrency}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                          {formatMoney(c.invoiced, baseCurrency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm whitespace-nowrap">
                          {c.unpaid > 0.000001 ? (
                            <span className="text-red-600">
                              {formatMoney(c.unpaid, baseCurrency)}
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
                    key={c.name}
                    className="flex items-center gap-3"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color ?? "#64748b" }}
                      />
                      <span className="text-sm truncate">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {baseCurrency}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 w-10 text-right shrink-0">
                      {c.count}x
                    </span>
                    <span className="text-sm tabular-nums whitespace-nowrap text-right w-32 shrink-0">
                      {formatMoney(c.total, baseCurrency)}
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
              `Invoice terkirim/dilihat/terlambat. Draft tidak dihitung. Ringkasan bucket setara ${baseCurrency}. Baris detail tetap currency asli.`,
              `Sent/viewed/overdue invoices only. Drafts excluded. Bucket summaries in ${baseCurrency}. Detail rows keep original currency.`,
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
                  {b.amount > 0.000001 ? (
                    <div className="text-lg font-semibold tabular-nums whitespace-nowrap">
                      {formatMoney(b.amount, baseCurrency)}
                    </div>
                  ) : (
                    <div className="text-lg font-semibold tabular-nums text-slate-400">
                      —
                    </div>
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
                        <div>{formatMoney(i.remaining, i.currency)}</div>
                        {i.remainingBase !== null &&
                          normalizeCurrency(i.currency) !== baseCurrency && (
                            <div className="text-xs font-normal text-slate-500">
                              ≈ {formatMoney(i.remainingBase, baseCurrency)}
                            </div>
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

      {/* Cash flow forecast */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t("Proyeksi arus kas", "Cash flow forecast")}
          </CardTitle>
          <CardDescription>
            {t(
              `Piutang terlambat + invoice jatuh tempo 3 bulan ke depan + pengeluaran rutin, setara ${baseCurrency}.`,
              `Overdue AR + invoices due in next 3 months + recurring expenses, equiv. ${baseCurrency}.`,
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
                {overdueIncome > 0.000001 ? (
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">
                      {t("Masuk", "In")}
                    </span>
                    <span className="tabular-nums text-emerald-700 whitespace-nowrap">
                      +{formatMoney(overdueIncome, baseCurrency)}
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-400">—</div>
                )}
                <div className="flex justify-between border-t pt-1 font-semibold gap-2">
                  <span>{t("Net", "Net")}</span>
                  <span className="tabular-nums text-right">
                    {overdueNet > 0.000001
                      ? formatMoney(overdueNet, baseCurrency)
                      : "—"}
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
                  {cf.expectedIncome <= 0.000001 &&
                  cf.recurringExpenses <= 0.000001 ? (
                    <div className="text-slate-400 text-xs">
                      {t("Tidak ada proyeksi", "No projection")}
                    </div>
                  ) : null}
                  {cf.expectedIncome > 0.000001 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        {t("Masuk", "In")}
                      </span>
                      <span className="tabular-nums text-emerald-700 whitespace-nowrap">
                        +{formatMoney(cf.expectedIncome, baseCurrency)}
                      </span>
                    </div>
                  )}
                  {cf.recurringExpenses > 0.000001 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">
                        {t("Rutin", "Recurring")}
                      </span>
                      <span className="tabular-nums text-red-600 whitespace-nowrap">
                        −{formatMoney(cf.recurringExpenses, baseCurrency)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-semibold gap-2">
                    <span>{t("Net", "Net")}</span>
                    <span
                      className={`tabular-nums text-right ${
                        cf.net >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {Math.abs(cf.net) > 0.000001
                        ? formatMoney(cf.net, baseCurrency)
                        : "—"}
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
              `Hanya pengeluaran yang ditandai ke proyek. Total setara ${baseCurrency}.`,
              `Only expenses tagged to a project. Totals in ${baseCurrency}.`,
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
                      <TableCell className="text-right text-sm tabular-nums whitespace-nowrap">
                        {formatMoney(p.amount, baseCurrency)}
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
