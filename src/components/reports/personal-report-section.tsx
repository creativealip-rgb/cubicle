import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Wallet,
  PiggyBank,
  ShoppingBag,
  HeartHandshake,
  Tag,
  ArrowRight,
  ReceiptText,
  PieChart as PieChartIcon,
} from "lucide-react";
import {
  listPersonalTransactions,
  listPersonalTransactionCategories,
} from "@/lib/actions/personal-transactions";
import { getPersonalBudget } from "@/lib/actions/personal-budget";
import { budgetTargets } from "@/lib/personal-productivity/budget";
import { budgetProgress } from "@/lib/personal-productivity/money";
import { BudgetDonutChart } from "@/components/reports/budget-donut-chart";

interface PersonalReportSectionProps {
  month: string;
  t: (id: string, en: string) => string;
}

export async function PersonalReportSection({ month, t }: PersonalReportSectionProps) {
  const [allTransactions, categories, budgetData] = await Promise.all([
    listPersonalTransactions(),
    listPersonalTransactionCategories(),
    getPersonalBudget(month),
  ]);

  const currencyCode = budgetData.budget?.currency || "IDR";
  const income = Number(budgetData.budget?.income || 0);

  // Filter transactions for the selected month
  const monthTransactions = allTransactions.filter((tx) => tx.date.startsWith(month));
  const expenseTransactions = monthTransactions.filter((tx) => tx.transactionType === "expense");
  const totalSpent = expenseTransactions.reduce((acc, tx) => acc + Number(tx.amount), 0);

  // 50/30/20 Targets & Actuals
  const targets = budgetData.budget?.enabled
    ? budgetTargets(
        budgetData.budget.income,
        budgetData.budget.needsPct,
        budgetData.budget.wantsPct,
        budgetData.budget.savingsPct,
      )
    : null;

  const actualNeeds = Number(budgetData.actual.needs || 0);
  const actualWants = Number(budgetData.actual.wants || 0);
  const actualSavings = Number(budgetData.actual.savings || 0);

  const needsProgress = targets ? budgetProgress(String(actualNeeds), targets.needs) : { percent: 0, over: false };
  const wantsProgress = targets ? budgetProgress(String(actualWants), targets.wants) : { percent: 0, over: false };
  const savingsProgress = targets ? budgetProgress(String(actualSavings), targets.savings) : { percent: 0, over: false };

  // Savings rate calculation
  const savingsRate = income > 0 ? Math.round((actualSavings / income) * 100) : 0;
  const needsRate = income > 0 ? Math.round((actualNeeds / income) * 100) : 0;
  const wantsRate = income > 0 ? Math.round((actualWants / income) * 100) : 0;

  // Category Breakdown for Personal Expenses
  const categoryMap = new Map<string, { id: string; name: string; color: string; total: number; count: number }>();
  for (const tx of expenseTransactions) {
    const key = tx.categoryId || "uncategorized";
    const catObj = categories.find((c) => c.id === tx.categoryId);
    const existing = categoryMap.get(key) ?? {
      id: key,
      name: catObj?.name || t("Tanpa Kategori", "Uncategorized"),
      color: catObj?.color || "#94a3b8",
      total: 0,
      count: 0,
    };
    existing.total += Number(tx.amount);
    existing.count += 1;
    categoryMap.set(key, existing);
  }

  const topPersonalCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  // Generate Smart Financial Health Insights
  const insights: string[] = [];
  if (income > 0) {
    if (savingsRate >= 20) {
      insights.push(t(`Hebat! Tingkat tabunganmu (${savingsRate}%) telah melampaui standar ideal 20%.`, `Great! Your savings rate (${savingsRate}%) exceeded the 20% ideal benchmark.`));
    } else {
      insights.push(t(`Tingkat tabunganmu baru ${savingsRate}% (target ideal: 20%). Alokasikan lebih banyak ke tabungan/investasi.`, `Your current savings rate is ${savingsRate}% (target: 20%). Try allocating more towards savings/investments.`));
    }

    if (wantsRate > 30) {
      insights.push(t(`Perhatian: Pos Keinginan (Wants) mencapai ${wantsRate}% (melebihi batas aman 30%).`, `Warning: Wants spending is at ${wantsRate}% (exceeding the 30% safe threshold).`));
    }

    if (needsRate <= 50) {
      insights.push(t(`Pengeluaran Kebutuhan Pokok (Needs) terkontrol sangat baik di angka ${needsRate}%.`, `Essential Needs spending is very well controlled at ${needsRate}%.`));
    } else {
      insights.push(t(`Kebutuhan Pokok mencapai ${needsRate}% (melebihi alokasi 50%). Evaluasi pengeluaran wajib.`, `Essential Needs spending is at ${needsRate}% (above 50% target). Review fixed expenses.`));
    }
  } else {
    insights.push(t("Atur target pemasukan bulanan di menu Personal Expenses > Budget 50/30/20 untuk mengaktifkan analisa otomatis.", "Set your monthly income target in Personal Expenses > Budget 50/30/20 to enable automated health analysis."));
  }

  // 5 Recent Transactions for the report summary
  const recentTransactions = [...monthTransactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* 4-KPI Strip: Income Target, Needs (50%), Wants (30%), Savings (20%) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Income / Target KPI */}
        <Card className="rounded-xl border shadow-none bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t("Target Pemasukan", "Income Target")}</span>
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(String(income), currencyCode)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t("Budget bulanan total", "Monthly total budget")}
          </p>
        </Card>

        {/* Needs (50%) KPI */}
        <Card className="rounded-xl border shadow-none bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t("Kebutuhan (Needs 50%)", "Needs (50%)")}</span>
            <HeartHandshake className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(String(actualNeeds), currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{needsRate}% {t("dari total", "of total")}</span>
            <Badge variant={needsProgress.over ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 font-normal">
              {needsProgress.over ? t("Over", "Over") : `${needsProgress.percent}%`}
            </Badge>
          </div>
        </Card>

        {/* Wants (30%) KPI */}
        <Card className="rounded-xl border shadow-none bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t("Keinginan (Wants 30%)", "Wants (30%)")}</span>
            <ShoppingBag className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(String(actualWants), currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{wantsRate}% {t("dari total", "of total")}</span>
            <Badge variant={wantsProgress.over ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 font-normal">
              {wantsProgress.over ? t("Over", "Over") : `${wantsProgress.percent}%`}
            </Badge>
          </div>
        </Card>

        {/* Savings (20%) KPI */}
        <Card className="rounded-xl border shadow-none bg-card p-4 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium">{t("Tabungan (Savings 20%)", "Savings (20%)")}</span>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-xl font-bold tracking-tight text-foreground tabular-nums">
            {formatMoney(String(actualSavings), currencyCode)}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{savingsRate}% {t("Savings Rate", "Savings Rate")}</span>
            <Badge variant={savingsRate >= 20 ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 font-normal">
              {savingsRate >= 20 ? t("Ideal", "Ideal") : `${savingsProgress.percent}%`}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Smart Health Insights Banner */}
      <Card className="rounded-xl border border-primary/20 bg-gradient-to-r from-primary/5 via-violet-500/5 to-transparent shadow-none p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                {t("Analisa Kesehatan Keuangan Pribadi", "Personal Financial Health Insights")}
              </p>
              <Badge variant="outline" className="text-[10px] bg-background">
                {month}
              </Badge>
            </div>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {insights.map((msg, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-primary font-bold">•</span>
                  <span>{msg}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      {/* Visual 50/30/20 Pie / Donut Chart & Allocation Health */}
      <Card className="rounded-xl border shadow-none bg-card">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <PieChartIcon className="h-4 w-4 text-primary" />
                {t("Komposisi Anggaran 50/30/20", "50/30/20 Budget Allocation Breakdown")}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("Visualisasi porsi belanja riil terhadap rasio ideal Needs, Wants, dan Savings", "Visual breakdown of actual spending against ideal Needs, Wants, and Savings ratio")}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="text-xs h-7 gap-1">
              <Link href="/app/expenses?scope=personal">
                <span>{t("Kelola Budget", "Manage Budget")}</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <BudgetDonutChart
            needs={actualNeeds}
            wants={actualWants}
            savings={actualSavings}
            currencyCode={currencyCode}
          />
        </CardContent>
      </Card>

      {/* 2-Column Grid: Top Categories & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Breakdown Kategori Belanja Pribadi */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Tag className="h-4 w-4 text-primary" />
                  {t("Kategori Pengeluaran Pribadi Terbesar", "Top Personal Expense Categories")}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("Rincian belanja dan pos pengeluaran harian", "Daily shopping and expense breakdown")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {topPersonalCategories.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("Belum ada transaksi belanja pribadi pada bulan ini.", "No personal expenses recorded this month.")}
              </p>
            ) : (
              <div className="space-y-3">
                {topPersonalCategories.map((category) => {
                  const pct = totalSpent > 0 ? (category.total / totalSpent) * 100 : 0;
                  return (
                    <div key={category.id} className="space-y-1 rounded-lg border p-2.5 bg-muted/10">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="font-semibold text-foreground truncate">
                            {category.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-medium">
                          <span className="tabular-nums font-bold text-foreground">
                            {formatMoney(String(category.total), currencyCode)}
                          </span>
                          <span className="text-muted-foreground w-8 text-right text-[11px]">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(4, pct))}%`,
                            backgroundColor: category.color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaksi Terbaru Personal */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ReceiptText className="h-4 w-4 text-primary" />
                  {t("Transaksi Terbaru", "Recent Transactions")}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {t("Riwayat mutasi keuangan personal terbaru", "Latest personal transaction history")}
                </CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
                <Link href="/app/expenses?scope=personal">{t("Semua Transaksi", "All Transactions")}</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {recentTransactions.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                {t("Belum ada mutasi transaksi personal pada bulan ini.", "No personal transactions recorded this month.")}
              </p>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => {
                  const cat = categories.find((c) => c.id === tx.categoryId);
                  const isIncome = tx.transactionType === "income";
                  const isSavings = tx.budgetBucket === "savings";
                  const isWants = tx.budgetBucket === "wants";

                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/10 text-xs"
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground truncate">{tx.description || t("Tanpa Keterangan", "No description")}</p>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1 py-0 uppercase font-mono shrink-0"
                          >
                            {isIncome
                              ? "Income"
                              : isSavings
                                ? "Savings"
                                : isWants
                                  ? "Wants"
                                  : "Needs"}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {tx.date} · {cat?.name || t("Tanpa Kategori", "Uncategorized")}
                        </p>
                      </div>
                      <span
                        className={`font-mono font-bold shrink-0 tabular-nums ${
                          isIncome
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-foreground"
                        }`}
                      >
                        {isIncome ? "+" : "-"}{formatMoney(String(tx.amount), currencyCode)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
