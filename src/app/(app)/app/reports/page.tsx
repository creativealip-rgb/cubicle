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
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Users,
  BarChart3,
  Wallet,
  ArrowRight,
} from "lucide-react";

async function getWorkspace() {
  return getWorkspaceFullForCurrentUser();
}

function formatMoney(amount: string | number, currency: string) {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  if (currency === "IDR") {
    return `Rp ${n.toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  }
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function ReportsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspace();
  await assertWorkspaceMember(db, user.id, ws.id);

  const today = new Date().toISOString().slice(0, 10);
  const yearStart = `${new Date().getFullYear()}-01-01`;

  // ─── Top clients by revenue (YTD) ───
  const clientRows = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      currency: invoices.currency,
      totalInvoiced: sql<string>`coalesce(sum(${invoices.total}), 0)::text`,
      totalPaid: sql<string>`coalesce(sum(case when ${invoices.status} = 'paid' then ${invoices.total} else 0 end), 0)::text`,
      invoiceCount: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(eq(invoices.workspaceId, ws.id), gte(invoices.issueDate, yearStart)))
    .groupBy(clients.id, clients.name, invoices.currency)
    .orderBy(desc(sql`sum(${invoices.total})`))
    .limit(10);

  // ─── Monthly P&L (last 6 months) ───
  const incomeRows = await db
    .select({
      month: sql<string>`to_char(${payments.paidAt}, 'YYYY-MM')`,
      total: sql<string>`sum(${payments.amount})`,
    })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(eq(invoices.workspaceId, ws.id))
    .groupBy(sql`to_char(${payments.paidAt}, 'YYYY-MM')`);

  const expenseRows = await db
    .select({
      month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
    })
    .from(expenses)
    .where(eq(expenses.workspaceId, ws.id))
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`, expenses.currency);

  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const incomeByMonth: Record<string, number> = {};
  incomeRows.forEach((r) => { incomeByMonth[r.month] = parseFloat(r.total ?? "0"); });
  const expensesByMonth: Record<string, Record<string, number>> = {};
  expenseRows.forEach((r) => {
    if (!expensesByMonth[r.month]) expensesByMonth[r.month] = {};
    expensesByMonth[r.month][r.currency] = parseFloat(r.total ?? "0");
  });

  // ─── Invoice aging ───
  const agingRows = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientName: clients.name,
      total: invoices.total,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      daysOverdue: sql<number>`case when ${invoices.dueDate} < ${today}::date then (${today}::date - ${invoices.dueDate})::int else 0 end`,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(
      eq(invoices.workspaceId, ws.id),
      sql`${invoices.status} not in ('paid', 'cancelled')`,
    ))
    .orderBy(invoices.dueDate);

  const buckets = {
    current: { count: 0, total: 0, currency: "IDR" },
    days_0_30: { count: 0, total: 0, currency: "IDR" },
    days_31_60: { count: 0, total: 0, currency: "IDR" },
    days_61_90: { count: 0, total: 0, currency: "IDR" },
    days_90_plus: { count: 0, total: 0, currency: "IDR" },
  };
  const overdueItems: Array<{ invoiceNumber: string; client: string; total: string; currency: string; dueDate: string; daysOverdue: number; id: string }> = [];
  for (const r of agingRows) {
    const total = parseFloat(r.total);
    const od = r.daysOverdue ?? 0;
    if (od === 0 || !r.dueDate) {
      buckets.current.count += 1;
      buckets.current.total += total;
    } else if (od <= 30) {
      buckets.days_0_30.count += 1;
      buckets.days_0_30.total += total;
    } else if (od <= 60) {
      buckets.days_31_60.count += 1;
      buckets.days_31_60.total += total;
    } else if (od <= 90) {
      buckets.days_61_90.count += 1;
      buckets.days_61_90.total += total;
    } else {
      buckets.days_90_plus.count += 1;
      buckets.days_90_plus.total += total;
    }
    if (od > 0) {
      overdueItems.push({
        invoiceNumber: r.invoiceNumber,
        client: r.clientName,
        total: r.total,
        currency: r.currency,
        dueDate: r.dueDate ?? "",
        daysOverdue: od,
        id: r.id,
      });
    }
  }

  // ─── Top expense categories (YTD) ───
  const topCats = await db
    .select({
      name: expenseCategories.name,
      color: expenseCategories.color,
      currency: expenses.currency,
      total: sql<string>`sum(${expenses.amount})`,
      count: sql<number>`count(*)::int`,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(and(eq(expenses.workspaceId, ws.id), gte(expenses.date, yearStart)))
    .groupBy(expenseCategories.name, expenseCategories.color, expenses.currency)
    .orderBy(desc(sql`sum(${expenses.amount})`))
    .limit(8);

  // ─── Per-project P&L (with client proxy) ───
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientName: clients.name,
      expenseTotal: sql<string>`coalesce(sum(${expenses.amount}) filter (where ${expenses.projectId} is not null), 0)::text`,
      expenseCount: sql<number>`count(${expenses.id})::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(expenses, eq(expenses.projectId, projects.id))
    .where(eq(projects.workspaceId, ws.id))
    .groupBy(projects.id, projects.name, clients.name)
    .orderBy(desc(sql`sum(${expenses.amount}) filter (where ${expenses.projectId} is not null)`))
    .limit(10);

  // YTD totals
  const ytdIncome = months.reduce((s, m) => s + (incomeByMonth[m] ?? 0), 0);
  const ytdExpenseIDR = months.reduce(
    (s, m) => s + (expensesByMonth[m]?.IDR ?? 0),
    0,
  );
  const ytdExpenseUSD = months.reduce(
    (s, m) => s + (expensesByMonth[m]?.USD ?? 0),
    0,
  );
  const ytdNetIDR = ytdIncome - ytdExpenseIDR;
  const totalInvoicedYtd = clientRows.reduce((sum, row) => sum + parseFloat(row.totalInvoiced), 0);
  const totalPaidYtd = clientRows.reduce((sum, row) => sum + parseFloat(row.totalPaid), 0);
  const collectionRate = totalInvoicedYtd > 0 ? Math.round((totalPaidYtd / totalInvoicedYtd) * 100) : 0;
  const outstandingTotal = agingRows.reduce((sum, row) => sum + parseFloat(row.total), 0);
  const overdueTotal = overdueItems.reduce((sum, row) => sum + parseFloat(row.total), 0);
  const overdueRate = outstandingTotal > 0 ? Math.round((overdueTotal / outstandingTotal) * 100) : 0;
  const pnlMax = Math.max(
    ...months.flatMap((m) => [incomeByMonth[m] ?? 0, expensesByMonth[m]?.IDR ?? 0]),
    1,
  );

  // ─── Cash flow forecast (next 3 months) ───
  const todayFc = new Date().toISOString().slice(0, 10);
  const fcLimit = new Date();
  fcLimit.setMonth(fcLimit.getMonth() + 3);
  const fcLimitStr = fcLimit.toISOString().slice(0, 10);

  const upcomingInvoices = await db
    .select({
      month: sql<string>`to_char(${invoices.dueDate}, 'YYYY-MM')`,
      total: sql<string>`sum(${invoices.total})`,
      count: sql<number>`count(*)::int`,
    })
    .from(invoices)
    .where(and(
      eq(invoices.workspaceId, ws.id),
      sql`${invoices.status} not in ('paid', 'cancelled')`,
      sql`${invoices.dueDate} is not null`,
      sql`${invoices.dueDate} >= ${todayFc}`,
      sql`${invoices.dueDate} <= ${fcLimitStr}`,
    ))
    .groupBy(sql`to_char(${invoices.dueDate}, 'YYYY-MM')`);

  const recurringRows = await db
    .select()
    .from(expenseRecurring)
    .where(and(eq(expenseRecurring.workspaceId, ws.id), eq(expenseRecurring.isActive, true)));

  const fcMonths: string[] = [];
  const fcNow = new Date();
  for (let i = 0; i < 3; i++) {
    const d = new Date(fcNow.getFullYear(), fcNow.getMonth() + i, 1);
    fcMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const incomeFc: Record<string, { total: number; count: number }> = {};
  upcomingInvoices.forEach((r) => { incomeFc[r.month] = { total: parseFloat(r.total ?? "0"), count: Number(r.count ?? 0) }; });

  const cashFlow = fcMonths.map((m) => {
    const recTotals: Record<string, number> = {};
    for (const r of recurringRows) {
      const startMonth = r.startDate.slice(0, 7);
      const endMonth = r.endDate ? r.endDate.slice(0, 7) : null;
      if (startMonth > m) continue;
      if (endMonth && endMonth < m) continue;
      const monthsDiff = (new Date(m + "-01").getFullYear() - new Date(startMonth + "-01").getFullYear()) * 12 +
        (new Date(m + "-01").getMonth() - new Date(startMonth + "-01").getMonth());
      const applies =
        (r.frequency === "monthly" && monthsDiff >= 0) ||
        (r.frequency === "quarterly" && monthsDiff >= 0 && monthsDiff % 3 === 0) ||
        (r.frequency === "yearly" && monthsDiff >= 0 && monthsDiff % 12 === 0);
      if (applies) recTotals[r.currency] = (recTotals[r.currency] ?? 0) + parseFloat(r.amount);
    }
    return {
      month: m,
      expectedIncome: incomeFc[m] ?? { total: 0, count: 0 },
      recurringExpenses: recTotals,
    };
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Laporan</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pendapatan, aging invoice, pengeluaran, dan proyeksi kas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/invoices/new">
              <TrendingUp className="h-4 w-4 mr-1" />
              Invoice baru
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/app/expenses">
              <Wallet className="h-4 w-4 mr-1" />
              Catat pengeluaran
            </Link>
          </Button>
        </div>
      </div>

      {/* YTD summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pendapatan YTD</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(ytdIncome, "IDR")}</div>
            <p className="text-xs text-slate-500 mt-1">dari invoice terbayar (6 bln terakhir)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Pengeluaran YTD</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{formatMoney(ytdExpenseIDR, "IDR")}</div>
            {ytdExpenseUSD > 0 && (
              <div className="text-sm text-slate-600 mt-1">+ {formatMoney(ytdExpenseUSD, "USD")}</div>
            )}
            <p className="text-xs text-slate-500 mt-1">Semua mata uang ditampilkan terpisah</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Bersih YTD</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-semibold ${ytdNetIDR >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatMoney(ytdNetIDR, "IDR")}
            </div>
            {ytdExpenseUSD > 0 && (
              <div className="text-xs text-slate-500 mt-1">USD bersih tidak ditampilkan (invoice terbayar hanya IDR)</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Collection health</CardTitle>
            <AlertCircle className={`h-4 w-4 ${overdueRate > 30 ? "text-red-500" : "text-emerald-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{collectionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {formatMoney(overdueTotal, "IDR")} overdue · {overdueRate}% dari outstanding
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly P&L bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Laba Rugi Bulanan (6 bulan terakhir)</CardTitle>
          <CardDescription>Pendapatan (otomatis) vs pengeluaran (IDR)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {months.map((m) => {
              const inc = incomeByMonth[m] ?? 0;
              const exp = expensesByMonth[m]?.IDR ?? 0;
              return (
                <div key={m} className="flex items-center gap-3">
                  <span className="text-xs font-mono w-16 text-slate-500">{m}</span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-emerald-500 rounded" style={{ width: `${(inc / pnlMax) * 100}%` }} />
                      <span className="text-xs tabular-nums w-32 text-right text-emerald-700">
                        +{formatMoney(inc, "IDR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 bg-red-400 rounded" style={{ width: `${(exp / pnlMax) * 100}%` }} />
                      <span className="text-xs tabular-nums w-32 text-right text-red-600">
                        −{formatMoney(exp, "IDR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top clients */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />
              Klien teratas (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {clientRows.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Belum ada invoice</p>
            ) : (
              <div className="overflow-x-auto">
              <Table className="min-w-[600px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Klien</TableHead>
                    <TableHead className="text-right">Ditagihkan</TableHead>
                    <TableHead className="text-right">Belum dibayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientRows.map((c) => {
                    const inv = parseFloat(c.totalInvoiced);
                    const paid = parseFloat(c.totalPaid);
                    const unpaid = inv - paid;
                    return (
                      <TableRow key={`${c.clientId}-${c.currency}`}>
                        <TableCell>
                          <Link href={`/app/clients/${c.clientId}`} className="text-sm font-medium hover:underline">
                            {c.clientName}
                          </Link>
                          <div className="text-xs text-slate-500">{c.invoiceCount} invoice{c.invoiceCount === 1 ? "" : "s"}</div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatMoney(inv, c.currency)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">
                          {unpaid > 0 ? (
                            <span className="text-red-600">{formatMoney(unpaid, c.currency)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top expense categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pengeluaran terbesar (YTD)</CardTitle>
          </CardHeader>
          <CardContent>
            {topCats.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Belum ada pengeluaran</p>
            ) : (
              <div className="space-y-2">
                {topCats.map((c) => (
                  <div key={`${c.name}-${c.currency}`} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-40">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color ?? "#64748b" }} />
                      <span className="text-sm">{c.name ?? "Tanpa kategori"}</span>
                    </div>
                    <span className="text-xs text-slate-500 w-12">{c.count}x</span>
                    <span className="text-sm tabular-nums flex-1 text-right">{formatMoney(c.total, c.currency)}</span>
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
            Umur Invoice (AR)
          </CardTitle>
          <CardDescription>Invoice belum dibayar berdasarkan hari terlambat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
            {Object.entries({
              Current: buckets.current,
              "0-30d": buckets.days_0_30,
              "31-60d": buckets.days_31_60,
              "61-90d": buckets.days_61_90,
              "90d+": buckets.days_90_plus,
            }).map(([label, b]) => (
              <div key={label} className="border rounded-lg p-3">
                <div className="text-xs text-slate-500">{label}</div>
                <div className="text-lg font-semibold tabular-nums">{formatMoney(b.total, "IDR")}</div>
                <div className="text-xs text-slate-500">{b.count} invoice{b.count === 1 ? "" : "s"}</div>
              </div>
            ))}
          </div>
          {overdueItems.length === 0 ? (
            <p className="text-sm text-slate-500 py-2 text-center">Tidak ada invoice terlambat 🎉</p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead>Jatuh Tempo</TableHead>
                  <TableHead className="text-right">Terlambat</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {overdueItems.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <Link href={`/app/invoices/${i.id}`} className="text-sm font-medium hover:underline">
                        {i.invoiceNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm">{i.client}</TableCell>
                    <TableCell className="text-xs text-slate-500 tabular-nums">{i.dueDate}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={i.daysOverdue > 60 ? "destructive" : "secondary"}>
                        {i.daysOverdue}d
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm font-medium">
                      {formatMoney(i.total, i.currency)}
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
          <CardTitle className="text-base">Proyeksi arus kas (3 bulan ke depan)</CardTitle>
          <CardDescription>
            Estimasi pendapatan dari invoice belum dibayar + proyeksi pengeluaran rutin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {cashFlow.map((cf) => {
              const inc = cf.expectedIncome.total;
              const expIDR = cf.recurringExpenses.IDR ?? 0;
              const expUSD = cf.recurringExpenses.USD ?? 0;
              const net = inc - expIDR;
              return (
                <div key={cf.month} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{cf.month}</span>
                    {cf.expectedIncome.count > 0 && (
                      <span className="text-xs text-slate-500">{cf.expectedIncome.count} inv</span>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Pendapatan</span>
                      <span className="tabular-nums text-emerald-700">+{formatMoney(inc, "IDR")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Rutin</span>
                      <span className="tabular-nums text-red-600">−{formatMoney(expIDR, "IDR")}</span>
                    </div>
                    {expUSD > 0 && (
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>+ USD</span>
                        <span>−{formatMoney(expUSD, "USD")}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Net</span>
                      <span className={`tabular-nums ${net >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatMoney(net, "IDR")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {recurringRows.length === 0 && (
            <p className="text-xs text-slate-500 mt-3">
              Belum ada pengeluaran rutin. Tambahkan di Pengeluaran untuk proyeksi lebih akurat.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Per-project P&L */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pengeluaran per project</CardTitle>
          <CardDescription>
            Pengeluaran per project. Pendapatan diambil dari invoice terbayar klien project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectRows.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center">Belum ada project</p>
          ) : (
            <div className="overflow-x-auto">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Project</TableHead>
                  <TableHead>Klien</TableHead>
                  <TableHead className="text-right">Pengeluaran</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRows.map((p) => {
                  const total = parseFloat(p.expenseTotal);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <Link href={`/app/projects/${p.id}`} className="text-sm font-medium hover:underline">
                          {p.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">{p.clientName ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {total > 0 ? formatMoney(total, "IDR") : <span className="text-slate-400">—</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7">
                          <Link href={`/app/projects/${p.id}`}>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
