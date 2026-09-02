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
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type CategoryOption,
  type ProjectOption,
  type ClientOption,
} from "@/components/expenses/expense-form";
import { CategoryManager } from "@/components/expenses/category-manager";
import { RecurringManager } from "@/components/expenses/recurring-manager";
import { ExpenseFilters } from "@/components/expenses/expense-filters";
import { ExpenseExcelExportButton } from "@/components/expenses/expense-excel-export";
import { ExpensesListTable } from "@/components/expenses/expenses-list-table";
import { AddExpenseButton } from "@/components/expenses/add-expense-button";
import {
  TrendingDown,
  Tag,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { getCurrentLang, createT } from "@/lib/i18n";
import { formatMoney } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import {
  PageHeader,
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Suspense } from "react";
import { PersonalExpensesSection } from "@/components/expenses/personal-expenses-section";
import { listPersonalTransactions } from "@/lib/actions/personal-transactions";
import { decodeExpenseCursor, encodeExpenseCursor, mergeUnifiedExpenses } from "@/lib/personal-productivity/unified-expenses";
import {
  aggregateToBase,
  buildRateMap,
  convertToBase,
  normalizeCurrency,
} from "@/lib/currency-base";

const PAGE_SIZE = 10;

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
    scope?: "all" | "business" | "personal";
    cursor?: string;
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
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : currentMonthKey();
  const categoryId = params.categoryId ?? "";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const tab =
    !params.tab && params.scope === "personal"
      ? "personal"
      : params.tab === "categories" ||
          params.tab === "recurring" ||
          params.tab === "personal"
        ? params.tab
        : "list";
  const scope =
    params.scope === "personal" || params.scope === "business"
      ? params.scope
      : "all";
  const expenseCursor = decodeExpenseCursor(params.cursor);
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

  // Projects (include clientId so form can filter by client)
  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
    })
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

  const missingFxList = Array.from(missingFx).sort();

  // Category breakdown in base currency
  const byCategory: Record<
    string,
    { name: string; color: string; total: number }
  > = {};
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
  if (expenseCursor)
    listConditions.push(
      sql`(${expenses.date}, ${expenses.createdAt}, 0, ${expenses.id}) < (${expenseCursor.date}::date, ${new Date(expenseCursor.createdAt)}::timestamptz, ${expenseCursor.sourceRank}, ${expenseCursor.id}::uuid)`,
    );

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
    .orderBy(desc(expenses.date), desc(expenses.createdAt), desc(expenses.id))
    .limit(100);

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
        ? convertToBase(
            Number(e.amount) || 0,
            e.currency,
            baseCurrency,
            rateMap,
          )
        : null;
      return { ...e, amountBase };
    });
  const personalForMerge = await listPersonalTransactions(expenseCursor, 100);
  const unifiedPage = mergeUnifiedExpenses(
    personalForMerge.map((row) => ({
      id: row.id,
      source: "personal" as const,
      date: row.date,
      createdAt: row.createdAt,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
    })),
    allForFilter.map((row) => ({
      id: row.id,
      source: "business" as const,
      date: row.date,
      createdAt: row.createdAt,
      description: row.description,
      amount: row.amount,
      currency: row.currency,
    })),
    PAGE_SIZE,
    expenseCursor,
  );
  const unifiedRows = unifiedPage.rows;

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
    .leftJoin(
      expenseCategories,
      eq(expenseCategories.id, expenseRecurring.categoryId),
    )
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

  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        actions={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            {canWrite && (
              <AddExpenseButton
                workspaceId={ws.id}
                defaultCurrency={ws.defaultCurrency}
                categories={categories}
                projects={projectOpts}
                clients={clientOpts}
                triggerClassName="flex-1 sm:flex-none gap-1"
              />
            )}
            <ExpenseExcelExportButton
              month={month}
              categoryId={categoryId || undefined}
              q={q || undefined}
            />
          </div>
        }
      >
        <PageHeaderTitle>{t("Pengeluaran", "Expenses")}</PageHeaderTitle>
        <PageHeaderDescription>
          {t(
            "Catat dan kelola biaya bisnis.",
            "Record and manage business expenses.",
          )}
        </PageHeaderDescription>
      </PageHeader>

      {missingFxList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(
            `Kurs belum di-set: ${missingFxList.join(", ")}. Angka currency itu di-skip di ringkasan. `,
            `Missing FX rates: ${missingFxList.join(", ")}. Those currencies are skipped in summaries. `,
          )}
          <Link
            href="/app/settings?tab=workspace"
            className="underline underline-offset-2 font-medium"
          >
            {t("Atur di Settings", "Set in Settings")}
          </Link>
        </div>
      )}

      {/* Operational summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
        <Card className="min-w-0">
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
            <p className="text-xs text-muted-foreground mt-1">
              {t(
                `Bulan terpilih · setara ${baseCurrency}`,
                `Selected month · equiv. ${baseCurrency}`,
              )}
            </p>
          </CardContent>
        </Card>
        <Card className="lg:w-72">
          <CardContent className="flex h-full flex-col justify-center gap-3 p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart3 className="h-4 w-4 text-blue-600" />
              {t("Butuh gambaran keuangan?", "Need a financial overview?")}
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t(
                "Pemasukan, bersih, tren, dan piutang tersedia di Laporan.",
                "Income, net, trends, and receivables are available in Reports.",
              )}
            </p>
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link href="/app/reports">
                {t("Lihat laporan lengkap", "View full report")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Category breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {t("Bulan ini per kategori", "This month by category")}
              <span className="text-xs font-normal text-muted-foreground">
                ({baseCurrency})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryBreakdown.map((c) => {
                const pct = barTotal > 0 ? (c.primary / barTotal) * 100 : 0;
                return (
                  <div key={c.name} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: c.color }}
                        />
                        <span className="text-sm truncate">{c.name}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm tabular-nums whitespace-nowrap">
                          {formatMoney(c.primary, baseCurrency)}
                        </span>
                        <span className="text-xs text-muted-foreground w-8 text-right">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${Math.min(100, pct)}%`,
                          backgroundColor: c.color,
                        }}
                      />
                    </div>
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
          <StatusFilterTabs
            activeValue={tab}
            hideEmpty={false}
            tabs={[
              {
                value: "list",
                label: t("Daftar", "List"),
                href: tabHref("list"),
                alwaysShow: true,
              },
              {
                value: "personal",
                label: t("Pribadi", "Personal"),
                href: tabHref("personal"),
                alwaysShow: true,
              },
              {
                value: "recurring",
                label: t("Rutin", "Recurring"),
                href: tabHref("recurring"),
                alwaysShow: true,
              },
              {
                value: "categories",
                label: t("Kategori", "Categories"),
                href: tabHref("categories"),
                alwaysShow: true,
              },
            ]}
          />
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
          {tab === "personal" && (
            <PersonalExpensesSection month={month} t={t} />
          )}

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
              <div
                className="mb-4 flex flex-wrap gap-2"
                aria-label={t(
                  "Filter sumber transaksi",
                  "Transaction source filter",
                )}
              >
                {(["all", "personal", "business"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={scope === value ? "default" : "outline"}
                    asChild
                  >
                    <Link href={`/app/expenses?month=${month}&scope=${value}`}>
                      {value === "all"
                        ? t("Semua", "All")
                        : value === "personal"
                          ? t("Pribadi", "Personal")
                          : t("Bisnis", "Business")}
                    </Link>
                  </Button>
                ))}
              </div>
              {scope === "all" && unifiedRows.length > 0 && (
                <div className="mb-4 divide-y rounded-lg border">
                  {unifiedRows.map((row) => (
                    <div
                      key={`${row.source}:${row.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 p-3"
                    >
                      <div>
                        <p className="font-medium">{row.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.date} ·{" "}
                          {row.source === "personal"
                            ? t("Pribadi", "Personal")
                            : t("Bisnis", "Business")}
                        </p>
                      </div>
                      <span className="font-medium">
                        {row.currency} {row.amount}
                      </span>
                    </div>
                  ))}
                  {unifiedPage.cursor && (
                    <div className="p-3 text-center">
                      <Button variant="outline" asChild>
                        <Link href={`/app/expenses?month=${month}&scope=all&cursor=${encodeExpenseCursor(unifiedPage.cursor)}`}>
                          {t("Muat lebih lama", "Load older")}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {scope === "personal" && (
                <PersonalExpensesSection month={month} t={t} />
              )}
              {scope === "business" && (
                <>
                  {expenseRows.length === 0 ? (
                    <div className="py-8 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        {q || categoryId
                          ? t(
                              "Tidak ada pengeluaran cocok filter.",
                              "No expenses match filters.",
                            )
                          : t(
                              "Belum ada pengeluaran bulan ini.",
                              "No expenses this month.",
                            )}
                      </p>
                      {canWrite && !q && !categoryId && (
                        <AddExpenseButton
                          workspaceId={ws.id}
                          defaultCurrency={ws.defaultCurrency}
                          categories={categories}
                          projects={projectOpts}
                          clients={clientOpts}
                          variant="outline"
                        />
                      )}
                    </div>
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
                        <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                          <span className="text-xs sm:text-sm">
                            {t(
                              `Menampilkan ${rangeStart}–${rangeEnd} dari ${totalCount}`,
                              `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`,
                            )}
                          </span>
                          <div className="flex gap-1 self-end sm:self-auto">
                            {safePage <= 1 ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0"
                                disabled
                              >
                                <ChevronLeft className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0"
                                asChild
                              >
                                <Link href={pageHref(safePage - 1)}>
                                  <ChevronLeft className="h-4 w-4" />
                                </Link>
                              </Button>
                            )}
                            {safePage >= totalPages ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0"
                                disabled
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-10 w-10 p-0"
                                asChild
                              >
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
                          {t(
                            `Menampilkan ${rangeStart}–${rangeEnd} dari ${totalCount}`,
                            `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`,
                          )}
                        </p>
                      )}
                    </>
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
