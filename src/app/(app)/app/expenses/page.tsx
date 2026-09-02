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
import { and, desc, eq, gte, lte } from "drizzle-orm";
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
  PageHeaderDescription,
  PageHeaderTitle,
} from "@/components/ui/page-header";
import { Suspense } from "react";
import { PersonalExpensesSection } from "@/components/expenses/personal-expenses-section";
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
  const scope = params.scope === "personal" || params.tab === "personal" ? "personal" : "business";
  const month =
    params.month && /^\d{4}-\d{2}$/.test(params.month)
      ? params.month
      : currentMonthKey();
  const categoryId = params.categoryId ?? "";
  const q = (params.q ?? "").trim();
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const tab =
    scope === "personal"
      ? "personal"
      : params.tab === "categories" || params.tab === "recurring"
        ? params.tab
        : "list";
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
    if (scope === "personal") {
      sp.set("scope", "personal");
    } else if (tab !== "list") {
      sp.set("tab", tab);
    }
    if (p > 1) sp.set("page", String(p));
    return `/app/expenses?${sp.toString()}`;
  }

  function tabHref(next: string) {
    const sp = new URLSearchParams();
    sp.set("month", month);
    if (categoryId) sp.set("categoryId", categoryId);
    if (q) sp.set("q", q);
    if (scope === "personal") {
      sp.set("scope", "personal");
    } else if (next !== "list") {
      sp.set("tab", next);
    }
    return `/app/expenses?${sp.toString()}`;
  }

  function scopeHref(nextScope: "business" | "personal") {
    const sp = new URLSearchParams();
    sp.set("month", month);
    if (nextScope === "personal") {
      sp.set("scope", "personal");
    }
    return `/app/expenses?${sp.toString()}`;
  }

  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(safePage * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <PageHeaderTitle>
            {scope === "personal"
              ? t("Keuangan Pribadi", "Personal Finance")
              : t("Pengeluaran Bisnis", "Business Expenses")}
          </PageHeaderTitle>
          <PageHeaderDescription>
            {scope === "personal"
              ? t(
                  "Pantau alokasi anggaran 50/30/20 dan transaksi belanja harian Anda.",
                  "Track your 50/30/20 budget allocation and daily personal transactions.",
                )
              : t(
                  "Catat dan kelola biaya operasional serta pengeluaran workspace.",
                  "Record and manage business and workspace expenses.",
                )}
          </PageHeaderDescription>
        </div>

        {scope === "business" && (
          <div className="flex flex-wrap items-center gap-2">
            {canWrite && (
              <AddExpenseButton
                workspaceId={ws.id}
                defaultCurrency={ws.defaultCurrency}
                categories={categories}
                projects={projectOpts}
                clients={clientOpts}
                triggerClassName="h-8 text-xs font-semibold rounded-lg gap-1"
              />
            )}
            <ExpenseExcelExportButton
              month={month}
              categoryId={categoryId || undefined}
              q={q || undefined}
            />
          </div>
        )}
      </div>

      {/* Scope Switcher: Segmented Control Bar di Bawah Deskripsi Header */}
      <div className="flex items-center">
        <div className="inline-flex rounded-xl bg-muted/70 p-1 border shadow-xs">
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
      </div>

      {scope === "business" && missingFxList.length > 0 && (
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

      {/* Operational summary - Compact & Engaging (Only in Business Mode) */}
      {scope === "business" && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-xl border shadow-none bg-card">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("Pengeluaran Bulan Ini", "This Month Spent")}
                </p>
                <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-foreground truncate">
                  {formatMoney(spentTotal, baseCurrency)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Bulan terpilih", "Selected month")} · {baseCurrency}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <TrendingDown className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-none bg-card">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("Kategori Terbesar", "Top Category")}
                </p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-foreground truncate">
                  {categoryBreakdown[0]?.name || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {categoryBreakdown[0]
                    ? `${formatMoney(categoryBreakdown[0].primary, baseCurrency)} (${((categoryBreakdown[0].primary / (barTotal || 1)) * 100).toFixed(0)}%)`
                    : t("Belum ada pengeluaran", "No expenses yet")}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Tag className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-xl border shadow-none bg-card sm:col-span-2 lg:col-span-1">
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("Analisis & Laporan", "Analytics & Reports")}
                </p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {t("Lihat tren arus kas, laba bersih, dan piutang.", "View cash flow trends, net profit & receivables.")}
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0 rounded-lg text-xs">
                <Link href="/app/reports">
                  <BarChart3 className="h-3.5 w-3.5 mr-1 text-blue-600" />
                  {t("Buka", "View")}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category breakdown (Business only) */}
      {scope === "business" && categoryBreakdown.length > 0 && (
        <Card className="rounded-xl border shadow-none bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Tag className="h-4 w-4 text-purple-600" />
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
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded overflow-hidden">
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

      {/* Main Content Area */}
      {scope === "personal" ? (
        <PersonalExpensesSection month={month} t={t} page={page} />
      ) : (
        <Card className="rounded-xl border shadow-none bg-card">
          <CardHeader className="space-y-4 pb-3 border-b">
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
          <CardContent className="pt-4">
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
                        <div className="flex items-center gap-1 self-end sm:self-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage <= 1}
                            asChild={safePage > 1}
                          >
                            {safePage > 1 ? (
                              <Link href={pageHref(safePage - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                              </Link>
                            ) : (
                              <span>
                                <ChevronLeft className="h-4 w-4" />
                              </span>
                            )}
                          </Button>
                          <span className="px-2 text-xs">
                            {safePage} / {totalPages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={safePage >= totalPages}
                            asChild={safePage < totalPages}
                          >
                            {safePage < totalPages ? (
                              <Link href={pageHref(safePage + 1)}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            ) : (
                              <span>
                                <ChevronRight className="h-4 w-4" />
                              </span>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
