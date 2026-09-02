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
} from "lucide-react";
import {
  listPersonalTransactions,
  listPersonalTransactionCategories,
} from "@/lib/actions/personal-transactions";
import { getPersonalBudget } from "@/lib/actions/personal-budget";
import { budgetTargets } from "@/lib/personal-productivity/budget";
import { budgetProgress } from "@/lib/personal-productivity/money";

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
      insights.push(t(`Pos Kebutuhan pokok (Needs) terkontrol dengan sangat baik di angka ${needsRate}%.`, `Essential Needs spending is very well controlled at ${needsRate}%.`));
    }
  } else {
    insights.push(t("Target pemasukan bulanan belum diatur di menu Pengeluaran > Pribadi.", "Monthly income target is not configured yet under Expenses > Personal."));
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 4-KPI Strip: Target Pemasukan, Needs, Wants, Savings */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Target Income */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("Target Pemasukan", "Income Target")}
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tabular-nums tracking-tight text-foreground truncate sm:text-2xl">
                {formatMoney(String(income), currencyCode)}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("Total budget bulanan", "Monthly total budget")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Needs (50%) */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("Kebutuhan (Needs)", "Needs (50%)")}
              </span>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <HeartHandshake className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tabular-nums tracking-tight text-foreground truncate sm:text-2xl">
                {formatMoney(String(actualNeeds), currencyCode)}
              </div>
              <p className="mt-1 text-[11px] font-medium text-blue-600 truncate">
                {needsRate}% {t("dari total income", "of total income")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Wants (30%) */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("Keinginan (Wants)", "Wants (30%)")}
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className={`text-xl font-bold tabular-nums tracking-tight truncate sm:text-2xl ${wantsProgress.over ? "text-rose-600" : "text-foreground"}`}>
                {formatMoney(String(actualWants), currencyCode)}
              </div>
              <p className={`mt-1 text-[11px] font-medium truncate ${wantsProgress.over ? "text-rose-600" : "text-amber-600"}`}>
                {wantsRate}% {t("dari total income", "of total income")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Savings (20%) */}
        <Card className="rounded-xl border shadow-none bg-card">
          <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {t("Tabungan (Savings)", "Savings (20%)")}
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <PiggyBank className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="text-xl font-bold tabular-nums tracking-tight text-emerald-600 truncate sm:text-2xl">
                {formatMoney(String(actualSavings), currencyCode)}
              </div>
              <p className="mt-1 text-[11px] font-medium text-emerald-600 truncate">
                {savingsRate}% {t("Savings Rate", "Savings Rate")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Financial Health Insight Strip */}
      {insights.length > 0 && (
        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5 flex items-start gap-3 text-xs sm:text-sm">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-semibold text-foreground">{t("Insight Keuangan Pribadi (50/30/20)", "Personal Finance Insight (50/30/20)")}</p>
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

      {/* Visual 50/30/20 Allocation Card */}
      <Card className="rounded-xl border shadow-none bg-card">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-semibold">
                {t("Kepatuhan Anggaran 50/30/20", "50/30/20 Budget Allocation Health")}
              </CardTitle>
              <CardDescription className="text-xs">
                {t("Perbandingan realisasi pengeluaran terhadap batas maksimal anggaran", "Actual spending vs maximum budget threshold")}
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm" className="h-7 text-xs rounded-lg self-start sm:self-auto">
              <Link href="/app/expenses?scope=personal">
                {t("Kelola Anggaran", "Manage Budget")}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          {/* Needs Progress Bar */}
          <div className="space-y-1.5 rounded-xl border p-3 bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-foreground">{t("Kebutuhan Pokok (Needs)", "Essential Needs")}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Target: 50%</Badge>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="tabular-nums font-bold text-foreground">{formatMoney(String(actualNeeds), currencyCode)}</span>
                {targets && <span className="text-muted-foreground text-[11px]">/ {formatMoney(targets.needs, currencyCode)}</span>}
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${needsProgress.over ? "bg-rose-500" : "bg-blue-500"}`}
                style={{ width: `${Math.min(100, Math.max(2, needsProgress.percent))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>{t("Realisasi:", "Realization:")} {needsProgress.percent}%</span>
              <span>{needsProgress.over ? t("⚠️ Melebihi Kuota", "⚠️ Over Budget") : t("✓ Dalam Batas Aman", "✓ Within Safe Limit")}</span>
            </div>
          </div>

          {/* Wants Progress Bar */}
          <div className="space-y-1.5 rounded-xl border p-3 bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-semibold text-foreground">{t("Keinginan & Gaya Hidup (Wants)", "Lifestyle & Wants")}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Target: 30%</Badge>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="tabular-nums font-bold text-foreground">{formatMoney(String(actualWants), currencyCode)}</span>
                {targets && <span className="text-muted-foreground text-[11px]">/ {formatMoney(targets.wants, currencyCode)}</span>}
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${wantsProgress.over ? "bg-rose-500" : "bg-amber-500"}`}
                style={{ width: `${Math.min(100, Math.max(2, wantsProgress.percent))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>{t("Realisasi:", "Realization:")} {wantsProgress.percent}%</span>
              <span>{wantsProgress.over ? t("⚠️ Melebihi Kuota", "⚠️ Over Budget") : t("✓ Dalam Batas Aman", "✓ Within Safe Limit")}</span>
            </div>
          </div>

          {/* Savings Progress Bar */}
          <div className="space-y-1.5 rounded-xl border p-3 bg-muted/20">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <span className="font-semibold text-foreground">{t("Tabungan & Investasi (Savings)", "Savings & Investments")}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">Target: 20%</Badge>
              </div>
              <div className="flex items-center gap-2 font-medium">
                <span className="tabular-nums font-bold text-emerald-600">{formatMoney(String(actualSavings), currencyCode)}</span>
                {targets && <span className="text-muted-foreground text-[11px]">/ {formatMoney(targets.savings, currencyCode)}</span>}
              </div>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, savingsProgress.percent))}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
              <span>{t("Tercapai:", "Achieved:")} {savingsProgress.percent}%</span>
              <span className="text-emerald-600 font-semibold">{savingsRate >= 20 ? t("✓ Target Terpenuhi", "✓ Target Met") : t("Perlu Ditambah", "Needs Boost")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Button asChild variant="ghost" size="sm" className="text-xs h-7 px-2">
              <Link href="/app/expenses?scope=personal">{t("Semua Transaksi", "All Transactions")}</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {topPersonalCategories.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("Belum ada transaksi belanja pribadi pada bulan ini.", "No personal expenses recorded this month.")}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {topPersonalCategories.map((category) => {
                const pct = totalSpent > 0 ? (category.total / totalSpent) * 100 : 0;
                return (
                  <div key={category.id} className="space-y-1.5 rounded-xl border p-3 bg-muted/10">
                    <div className="flex items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
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
                    {/* Visual Progress Bar */}
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(4, pct))}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {category.count} {t("transaksi", "transactions")} · {pct.toFixed(1)}% {t("dari total belanja", "of total spent")}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
