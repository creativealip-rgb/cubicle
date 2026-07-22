import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  expenses,
  expenseCategories,
  expenseRecurring,
  projects,
  clients,
  payments,
  invoices,
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseForm, type CategoryOption, type ProjectOption, type ClientOption } from "@/components/expenses/expense-form";
import { CategoryManager } from "@/components/expenses/category-manager";
import { RecurringManager } from "@/components/expenses/recurring-manager";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseCsvExportButton } from "@/components/expenses/expense-csv-export";
import { ExpensesListTable } from "@/components/expenses/expenses-list-table";
import { TrendingDown, TrendingUp, Wallet, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Suspense } from "react";
import {
  aggregateToBase,
  buildRateMap,
  convertToBase,
  normalizeCurrency,
} from "@/lib/currency-base";

const PAGE_SIZE = 25;

function currentMonthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthBounds(month: string) {
  // month = YYYY-MM; inclusive date range as strings
  const [y, m] = month.split("-").map(Number);
  const start = `${month}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${month}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    month?: string;
    categoryId?: string;
    q?: string;
    page?: string;
    tab?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, ws.id);
  const canWrite = member.role === "owner" || member.role === "member";

  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonthKey();
  const categoryId = params.categoryId ?? "";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const tab = params.tab === "categories" || params.tab === "recurring" ? params.tab : "list";
  const { start: monthStart, end: monthEnd } = monthBounds(month);

  // Categories
  const categoryRows = await db
    .select()
    .from(expenseCategories)
    .where(eq(expenseCategories.workspaceId, ws.id))
    .orderBy(expenseCategories.name);
  const categories: CategoryOption[] = categoryRows.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    icon: c.icon,
  }));

  // Projects
  const projectRows = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, ws.id))
    .orderBy(projects.name);
  const projectOpts: ProjectOption[] = projectRows;

  // Clients
  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, ws.id))
    .orderBy(clients.name);
  const clientOpts: ClientOption[] = clientRows;

  // Month expenses (for KPI + breakdown) — convert to base currency
  const baseCurrency = normalizeCurrency(ws.defaultCurrency || "IDR");
  const rateRows = await db
    .select({
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, ws.id));
  const rateMap = buildRateMap(rateRows);

  const monthExpenseRows = await db
    .select({
      amount: expenses.amount,
      currency: expenses.currency,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .where(
      and(
        eq(expenses.workspaceId, ws.id),
        gte(expenses.date, monthStart),
        lte(expenses.date, monthEnd),
      ),
    );

  const spentAgg = aggregateToBase(
    monthExpenseRows.map((e) => ({
      amount: parseFloat(e.amount),
      currency: e.currency,
    })),
    baseCurrency,
    rateMap,
  );
  const spentTotal = spentAgg.total;
  const missingFx = new Set(spentAgg.missingCurrencies);

  // Income this month — convert payments to base
  const incomeRows = await db
    .select({ amount: payments.amount, currency: invoices.currency })
    .from(payments)
    .innerJoin(invoices, eq(invoices.id, payments.invoiceId))
    .where(
      and(
        eq(invoices.workspaceId, ws.id),
        gte(payments.paidAt, monthStart),
        lte(payments.paidAt, monthEnd),
      ),
    );
  const incomeAgg = aggregateToBase(
    incomeRows.map((p) => ({
      amount: parseFloat(p.amount),
      currency: p.currency,
    })),
    baseCurrency,
    rateMap,
  );
  const incomeTotal = incomeAgg.total;
  for (const c of incomeAgg.missingCurrencies) missingFx.add(c);

  const netTotal = incomeTotal - spentTotal;
  const netPositive = netTotal >= 0;
  const missingFxList = Array.from(missingFx).sort();

  // Category breakdown in base currency
  const byCategory: Record<string, { name: string; color: string; total: number }> = {};
  for (const e of monthExpenseRows) {
    const converted = convertToBase(
      parseFloat(e.amount),
      e.currency,
      baseCurrency,
      rateMap,
    );
    if (converted === null) continue;
    const key = e.categoryId ?? "uncategorized";
    if (!byCategory[key]) {
      byCategory[key] = {
        name: e.categoryName ?? t("Tanpa Kategori", "Uncategorized"),
        color: e.categoryColor ?? "#64748b",
        total: 0,
      };
    }
    byCategory[key].total += converted;
  }
  const barTotal = spentTotal;
  const categoryBreakdown = Object.values(byCategory)
    .map((c) => ({
      name: c.name,
      color: c.color,
      primary: c.total,
    }))
    .sort((a, b) => b.primary - a.primary);

  // List filters
  const listConditions = [eq(expenses.workspaceId, ws.id)];
  // Default list shows selected month; search q can broaden but still month-scoped for clarity
  listConditions.push(gte(expenses.date, monthStart));
  listConditions.push(lte(expenses.date, monthEnd));
  if (categoryId) listConditions.push(eq(expenses.categoryId, categoryId));

  const allForFilter = await db
    .select({
      id: expenses.id,
      date: expenses.date,
      amount: expenses.amount,
      currency: expenses.currency,
      description: expenses.description,
      vendor: expenses.vendor,
      categoryId: expenses.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      projectId: expenses.projectId,
      projectName: projects.name,
      clientId: expenses.clientId,
      clientName: clients.name,
      taxIncluded: expenses.taxIncluded,
      taxAmount: expenses.taxAmount,
      receiptUrl: expenses.receiptUrl,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenses.categoryId))
    .leftJoin(projects, eq(projects.id, expenses.projectId))
    .leftJoin(clients, eq(clients.id, expenses.clientId))
    .where(and(...listConditions))
    .orderBy(desc(expenses.date), desc(expenses.createdAt));

  const qLower = q.toLowerCase();
  const filtered = q
    ? allForFilter.filter(
        (e) =>
          e.description.toLowerCase().includes(qLower) ||
          (e.vendor?.toLowerCase().includes(qLower) ?? false) ||
          (e.categoryName?.toLowerCase().includes(qLower) ?? false) ||
          (e.projectName?.toLowerCase().includes(qLower) ?? false) ||
          (e.clientName?.toLowerCase().includes(qLower) ?? false),
      )
    : allForFilter;

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const showApprox = ws.showBaseCurrencyApprox !== false;
  const expenseRows = filtered
    .slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
    .map((e) => {
      const amountBase = showApprox
        ? convertToBase(Number(e.amount) || 0, e.currency, baseCurrency, rateMap)
        : null;
      return { ...e, amountBase };
    });

  // Recurring
  const recurringRaw = await db
    .select({
      id: expenseRecurring.id,
      name: expenseRecurring.name,
      amount: expenseRecurring.amount,
      currency: expenseRecurring.currency,
      categoryId: expenseRecurring.categoryId,
      categoryName: expenseCategories.name,
      categoryColor: expenseCategories.color,
      projectId: expenseRecurring.projectId,
      projectName: projects.name,
      frequency: expenseRecurring.frequency,
      startDate: expenseRecurring.startDate,
      endDate: expenseRecurring.endDate,
      lastGeneratedDate: expenseRecurring.lastGeneratedDate,
      isActive: expenseRecurring.isActive,
      notes: expenseRecurring.notes,
    })
    .from(expenseRecurring)
    .leftJoin(expenseCategories, eq(expenseCategories.id, expenseRecurring.categoryId))
    .leftJoin(projects, eq(projects.id, expenseRecurring.projectId))
    .where(eq(expenseRecurring.workspaceId, ws.id))
    .orderBy(desc(expenseRecurring.isActive), expenseRecurring.name);

  const recurringRows = recurringRaw.map((r) => {
    const amountBase = showApprox
      ? convertToBase(Number(r.amount) || 0, r.currency, baseCurrency, rateMap)
      : null;
    return {
      ...r,
      frequency: r.frequency as "monthly" | "quarterly" | "yearly",
      amountBase,
    };
  });

  function pageHref(p: number) {
    const sp = new URLSearchParams();
    sp.set("month", month);
    if (categoryId) sp.set("categoryId", categoryId);
    if (q) sp.set("q", q);
    if (tab !== "list") sp.set("tab", tab);
    if (p > 1) sp.set("page", String(p));
    return `/app/expenses?${sp.toString()}`;
  }

  function tabHref(next: string) {
    const sp = new URLSearchParams();
    sp.set("month", month);
    if (categoryId) sp.set("categoryId", categoryId);
    if (q) sp.set("q", q);
    if (next !== "list") sp.set("tab", next);
    return `/app/expenses?${sp.toString()}`;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("Pengeluaran", "Expenses")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              `KPI setara ${baseCurrency} (kurs manual workspace). Daftar item tetap currency asli.`,
              `KPI in ${baseCurrency} (workspace manual FX). List items keep original currency.`,
            )}
          </p>
        </div>
        <ExpenseCsvExportButton month={month} categoryId={categoryId || undefined} q={q || undefined} />
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

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Pengeluaran bulan ini", "This month spent")}
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums whitespace-nowrap">
              {formatMoney(spentTotal, baseCurrency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(`setara ${baseCurrency}`, `equiv. ${baseCurrency}`)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Pendapatan bulan ini", "This month income")}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold tabular-nums whitespace-nowrap">
              {formatMoney(incomeTotal, baseCurrency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">{t("dari invoice lunas", "from paid invoices")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              {t("Bersih bulan ini", "Net this month")}
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-semibold tabular-nums whitespace-nowrap ${
                netPositive ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatMoney(netTotal, baseCurrency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {t(`setara ${baseCurrency} (kurs manual)`, `equiv. ${baseCurrency} (manual FX)`)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick add */}
      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Tambah Cepat", "Quick add")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseForm
              workspaceId={ws.id}
              defaultCurrency={ws.defaultCurrency}
              categories={categories}
              projects={projectOpts}
              clients={clientOpts}
              compact
            />
          </CardContent>
        </Card>
      )}

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t("Bulan ini per kategori", "This month by category")}
              <span className="text-xs font-normal text-slate-500">({baseCurrency})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {categoryBreakdown.map((c) => {
                const pct = barTotal > 0 ? (c.primary / barTotal) * 100 : 0;
                return (
                  <div key={c.name} className="flex items-center gap-3">
                    <div className="flex items-center gap-2 w-40 shrink-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-sm truncate">{c.name}</span>
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 rounded overflow-hidden min-w-[40px]">
                      <div
                        className="h-full rounded"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: c.color }}
                      />
                    </div>
                    <span className="text-sm tabular-nums w-32 text-right whitespace-nowrap shrink-0">
                      {formatMoney(c.primary, baseCurrency)}
                    </span>
                    <span className="text-xs text-slate-500 w-10 text-right shrink-0">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs: list / recurring / categories */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={tabHref("list")} scroll={false} prefetch>
              <Button size="sm" variant={tab === "list" ? "default" : "outline"} className="h-8">
                {t("Daftar", "List")}
              </Button>
            </Link>
            <Link href={tabHref("recurring")} scroll={false} prefetch>
              <Button size="sm" variant={tab === "recurring" ? "default" : "outline"} className="h-8">
                {t("Rutin", "Recurring")}
              </Button>
            </Link>
            <Link href={tabHref("categories")} scroll={false} prefetch>
              <Button size="sm" variant={tab === "categories" ? "default" : "outline"} className="h-8">
                {t("Kategori", "Categories")}
              </Button>
            </Link>
          </div>
          {tab === "list" && (
            <Suspense fallback={null}>
              <ExpenseFilters
                month={month}
                categoryId={categoryId}
                q={q}
                categories={categories}
              />
            </Suspense>
          )}
        </CardHeader>
        <CardContent>
          {tab === "categories" && (
            <CategoryManager
              workspaceId={ws.id}
              categories={categoryRows.map((c) => ({
                id: c.id,
                name: c.name,
                color: c.color,
                icon: c.icon,
                isDefault: c.isDefault,
              }))}
              canWrite={canWrite}
            />
          )}

          {tab === "recurring" && (
            <RecurringManager
              workspaceId={ws.id}
              rows={recurringRows}
              categories={categories}
              projects={projectOpts}
              canWrite={canWrite}
              defaultCurrency={ws.defaultCurrency}
              baseCurrency={baseCurrency}
            />
          )}

          {tab === "list" && (
            <>
              {expenseRows.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  {q || categoryId
                    ? t("Tidak ada pengeluaran cocok filter.", "No expenses match filters.")
                    : t(
                        "Belum ada pengeluaran bulan ini. Tambah lewat form di atas.",
                        "No expenses this month. Add one using the form above.",
                      )}
                </p>
              ) : (
                <>
                  <ExpensesListTable
                    rows={expenseRows}
                    canWrite={canWrite}
                    workspaceId={ws.id}
                    defaultCurrency={ws.defaultCurrency}
                    baseCurrency={baseCurrency}
                    categories={categories}
                    projects={projectOpts}
                    clients={clientOpts}
                  />

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
                      <span>
                        {t(
                          `${totalCount} entri · halaman ${safePage}/${totalPages}`,
                          `${totalCount} entries · page ${safePage}/${totalPages}`,
                        )}
                      </span>
                      <div className="flex gap-1">
                        {safePage <= 1 ? (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <Link href={pageHref(safePage - 1)}>
                              <ChevronLeft className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                        {safePage >= totalPages ? (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" disabled>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0" asChild>
                            <Link href={pageHref(safePage + 1)}>
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {totalPages <= 1 && totalCount > 0 && (
                    <p className="text-xs text-slate-400 mt-3 text-right">
                      {t(`${totalCount} entri`, `${totalCount} entries`)}
                    </p>
                  )}
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
