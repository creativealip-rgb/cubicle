import {
  createPersonalTransaction,
  createPersonalTransactionCategory,
  deletePersonalTransaction,
  deletePersonalTransactionCategory,
  updatePersonalTransaction,
  updatePersonalTransactionCategory,
  listPersonalTransactionCategories,
  listPersonalTransactions,
} from "@/lib/actions/personal-transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersonalBudgetSection } from "./personal-budget-section";
import { PersonalReceiptControl } from "./personal-receipt-control";
import { PersonalFinanceDialog } from "./personal-finance-dialog";
import { getPersonalBudget } from "@/lib/actions/personal-budget";
import { budgetTargets } from "@/lib/personal-productivity/budget";
import { budgetProgress } from "@/lib/personal-productivity/money";
import { Tag, Wallet, PieChart, ArrowDownRight } from "lucide-react";

export async function PersonalExpensesSection({
  month,
  t,
}: {
  month: string;
  t: (id: string, en: string) => string;
}) {
  const [rows, categories, budgetData] = await Promise.all([
    listPersonalTransactions(),
    listPersonalTransactionCategories(),
    getPersonalBudget(month),
  ]);

  async function create(fd: FormData) {
    "use server";
    const categoryId = String(fd.get("categoryId") || "") || null;
    const defaultBucketByCategory = Object.fromEntries(
      categories.map((item) => [item.id, item.defaultBucket]),
    );
    await createPersonalTransaction({
      categoryId,
      transactionType: String(fd.get("transactionType") || "expense") as
        "expense" | "allocation",
      budgetBucket: ((categoryId ? defaultBucketByCategory[categoryId] : null) ?? String(fd.get("budgetBucket") || "needs")) as
        "needs" | "wants" | "savings" | "unbudgeted",
      amount: String(fd.get("amount")),
      currency: String(fd.get("currency") || budgetData.budget?.currency || "IDR"),
      date: String(fd.get("date")),
      description: String(fd.get("description")),
      merchant: String(fd.get("merchant") || "") || null,
    });
  }

  async function createCategory(fd: FormData) {
    "use server";
    await createPersonalTransactionCategory({
      name: String(fd.get("name")),
      color: String(fd.get("color") || "#64748b"),
      defaultBucket: String(fd.get("defaultBucket")) as
        "needs" | "wants" | "savings" | "unbudgeted",
    });
  }

  async function remove(fd: FormData) {
    "use server";
    await deletePersonalTransaction(String(fd.get("id")));
  }

  async function editTransaction(fd: FormData) {
    "use server";
    await updatePersonalTransaction(String(fd.get("id")), {
      categoryId: String(fd.get("categoryId") || "") || null,
      transactionType: String(fd.get("transactionType")) as "expense" | "allocation",
      budgetBucket: String(fd.get("budgetBucket")) as "needs" | "wants" | "savings" | "unbudgeted",
      amount: String(fd.get("amount")),
      currency: String(fd.get("currency")),
      date: String(fd.get("date")),
      description: String(fd.get("description")),
      merchant: String(fd.get("merchant") || "") || null,
    });
  }

  async function editCategory(fd: FormData) {
    "use server";
    await updatePersonalTransactionCategory(String(fd.get("id")), {
      name: String(fd.get("name")),
      color: String(fd.get("color")),
      defaultBucket: String(fd.get("defaultBucket")) as "needs" | "wants" | "savings" | "unbudgeted",
    });
  }

  async function removeCategory(fd: FormData) {
    "use server";
    await deletePersonalTransactionCategory(String(fd.get("id")));
  }

  const locale = t("id-ID", "en-US");
  const currencyCode = budgetData.budget?.currency || "IDR";
  const money = (amount: string, curr: string = currencyCode) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 0 }).format(Number(amount));

  const today = new Date().toISOString().slice(0, 10);
  const monthRows = rows.filter((row) => row.date.startsWith(month));
  const spent = monthRows.filter((row) => row.transactionType === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const savings = monthRows.filter((row) => row.transactionType === "allocation").reduce((sum, row) => sum + Number(row.amount), 0);
  const income = Number(budgetData.budget?.income || 0);

  const categoryTotals = monthRows.reduce<Record<string, number>>((totals, row) => {
    const name = categories.find((category) => category.id === row.categoryId)?.name || t("Tanpa kategori", "Uncategorized");
    totals[name] = (totals[name] || 0) + Number(row.amount);
    return totals;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const targets = budgetData.budget?.enabled
    ? budgetTargets(
        budgetData.budget.income,
        budgetData.budget.needsPct,
        budgetData.budget.wantsPct,
        budgetData.budget.savingsPct,
      )
    : null;

  const budgetBuckets = targets
    ? [
        {
          key: "needs",
          label: t("Kebutuhan", "Needs"),
          pct: budgetData.budget?.needsPct || "50",
          target: targets.needs,
          actual: budgetData.actual.needs,
          color: "bg-blue-500",
        },
        {
          key: "wants",
          label: t("Keinginan", "Wants"),
          pct: budgetData.budget?.wantsPct || "30",
          target: targets.wants,
          actual: budgetData.actual.wants,
          color: "bg-amber-500",
        },
        {
          key: "savings",
          label: t("Tabungan", "Savings"),
          pct: budgetData.budget?.savingsPct || "20",
          target: targets.savings,
          actual: budgetData.actual.savings,
          color: "bg-emerald-500",
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Modals */}
      <div className="flex flex-wrap items-center justify-between gap-3" data-ui="personal-finance-actions">
        <div className="flex items-center gap-2">
          <PersonalFinanceDialog
            trigger={`+ ${t("Catat Transaksi", "Add Transaction")}`}
            title={t("Catat Transaksi Pribadi", "Add Personal Transaction")}
            description={t("Masukkan detail pengeluaran atau alokasi tabungan.", "Enter expense or savings allocation details.")}
          >
            <form action={create} className="space-y-4 pt-2" data-ui="personal-quick-add">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("Deskripsi", "Description")}</label>
                <Input name="description" required placeholder={t("Contoh: Makan siang, Belanja mingguan", "e.g. Lunch, Groceries")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("Jumlah", "Amount")}</label>
                  <Input name="amount" inputMode="decimal" required placeholder="0" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">{t("Kategori", "Category")}</label>
                  <select name="categoryId" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">{t("Tanpa kategori", "No category")}</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                  {t("Detail lainnya (Tanggal, Tipe, Merchant)", "More details (Date, Type, Merchant)")}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Tanggal", "Date")}</label>
                    <Input name="date" type="date" required defaultValue={today} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Merchant (Opsional)", "Merchant (Optional)")}</label>
                    <Input name="merchant" placeholder="e.g. Tokopedia, Starbucks" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Tipe Transaksi", "Transaction Type")}</label>
                    <select name="transactionType" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="expense">{t("Pengeluaran (Expense)", "Expense")}</option>
                      <option value="allocation">{t("Alokasi Tabungan", "Savings Allocation")}</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Pos 50/30/20", "50/30/20 Bucket")}</label>
                    <select name="budgetBucket" className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                      <option value="needs">Needs (Kebutuhan)</option>
                      <option value="wants">Wants (Keinginan)</option>
                      <option value="savings">Savings (Tabungan)</option>
                      <option value="unbudgeted">Unbudgeted</option>
                    </select>
                  </div>
                  <input type="hidden" name="currency" value={currencyCode} />
                </div>
              </details>

              <Button className="w-full rounded-xl">
                {t("Simpan Transaksi", "Save Transaction")}
              </Button>
            </form>
          </PersonalFinanceDialog>
        </div>

        <div className="flex items-center gap-2">
          <PersonalFinanceDialog
            trigger={t("Atur Budget 50/30/20", "Manage budget")}
            title={t("Pengaturan Anggaran 50/30/20", "50/30/20 Budget Settings")}
            description={t("Atur total pendapatan bulanan dan rasio kebutuhan/keinginan/tabungan.", "Configure monthly income and allocation split.")}
          >
            <PersonalBudgetSection month={month} t={t} compact />
          </PersonalFinanceDialog>

          <PersonalFinanceDialog
            trigger={t("Kelola Kategori", "Manage categories")}
            title={t("Kategori Pengeluaran Pribadi", "Personal Categories")}
            description={t("Tambah atau sesuaikan kategori pengeluaran dan default pos anggaran.", "Manage custom categories and default buckets.")}
          >
            <div className="space-y-4 pt-2">
              <form action={createCategory} className="space-y-3 rounded-xl border p-4 bg-muted/20">
                <p className="text-sm font-semibold">{t("Tambah Kategori Baru", "Add New Category")}</p>
                <Input name="name" required placeholder={t("Nama kategori...", "Category name...")} />
                <div className="grid grid-cols-2 gap-3 items-center">
                  <div className="flex items-center gap-2">
                    <Input name="color" type="color" defaultValue="#64748b" className="h-9 w-12 cursor-pointer p-0.5 rounded" />
                    <span className="text-xs text-muted-foreground">{t("Warna", "Color")}</span>
                  </div>
                  <select name="defaultBucket" className="h-9 w-full rounded-md border bg-background px-2 text-xs">
                    <option value="needs">Needs</option>
                    <option value="wants">Wants</option>
                    <option value="savings">Savings</option>
                    <option value="unbudgeted">Unbudgeted</option>
                  </select>
                </div>
                <Button size="sm" className="w-full rounded-lg">{t("Tambah Kategori", "Add Category")}</Button>
              </form>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <p className="text-xs font-medium text-muted-foreground uppercase">{t("Daftar Kategori", "Category List")}</p>
                {categories.map((category) => (
                  <form key={category.id} action={editCategory} className="flex items-center gap-2 rounded-lg border p-2 bg-background">
                    <input type="hidden" name="id" value={category.id} />
                    <input type="hidden" name="color" value={category.color} />
                    <input type="hidden" name="defaultBucket" value={category.defaultBucket} />
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                    <Input name="name" defaultValue={category.name} required className="h-8 text-xs flex-1" />
                    <Button variant="outline" size="sm" className="h-8 px-2 text-xs">{t("Simpan", "Save")}</Button>
                    <Button formAction={removeCategory} variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive">{t("Hapus", "Delete")}</Button>
                  </form>
                ))}
              </div>
            </div>
          </PersonalFinanceDialog>
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div data-ui="personal-finance-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: t("Pengeluaran bulan ini", "Spent this month"),
            value: money(String(spent)),
            desc: `${monthRows.length} ${t("transaksi", "transactions")}`,
            icon: Wallet,
          },
          {
            label: t("Sisa anggaran", "Remaining budget"),
            value: budgetData.budget ? money(String(Math.max(0, income - spent))) : "—",
            desc: budgetData.budget ? `${t("dari total", "of total")} ${money(String(income))}` : t("Belum diatur", "Not set"),
            icon: ArrowDownRight,
          },
          {
            label: t("Tabungan dialokasikan", "Savings allocated"),
            value: money(String(savings)),
            desc: t("Bulan ini", "This month"),
            icon: PieChart,
          },
          {
            label: t("Kategori terbesar", "Top category"),
            value: topCategory,
            desc: t("Pengeluaran tertinggi", "Highest expense"),
            icon: Tag,
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="rounded-xl border shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground/70" />
                </div>
                <p className="mt-2 truncate text-xl font-bold tracking-tight">{kpi.value}</p>
                <p className="mt-1 text-xs text-muted-foreground truncate">{kpi.desc}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Budget 50/30/20 Visual Dashboard */}
      <Card className="rounded-xl border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              {t("Alokasi Anggaran 50/30/20", "50/30/20 Budget Allocation")}
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {budgetData.budget?.enabled
                ? `${t("Target berdasarkan pendapatan", "Target based on income")} ${money(String(income))}`
                : t("Aktifkan anggaran untuk memantau batas pengeluaran.", "Enable budget to track limits.")}
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {budgetBuckets.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-3">
              {budgetBuckets.map((bucket) => {
                const progress = budgetProgress(bucket.actual, bucket.target);
                return (
                  <div key={bucket.key} className="rounded-xl border p-4 bg-muted/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{bucket.label} ({bucket.pct}%)</span>
                      <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                        {progress.percent}%
                      </span>
                    </div>

                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${progress.over ? "bg-destructive" : bucket.color}`}
                        style={{ width: `${Math.min(100, progress.percent)}%` }}
                      />
                    </div>

                    <div className="flex items-baseline justify-between text-xs">
                      <span className="tabular-nums font-medium">{money(bucket.actual)}</span>
                      <span className="text-muted-foreground tabular-nums">{t("Target", "Target")}: {money(bucket.target)}</span>
                    </div>

                    <p className={`text-[11px] ${progress.over ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      {progress.over
                        ? `${t("Melebihi budget", "Over budget")} (${money(String(Math.abs(Number(progress.remaining))))})`
                        : `${t("Sisa kuota", "Remaining")}: ${money(progress.remaining)}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              <p>{t("Belum ada anggaran 50/30/20 aktif untuk bulan ini.", "No active 50/30/20 budget for this month.")}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction History Table */}
      <Card data-ui="personal-finance-history" className="rounded-xl border shadow-none">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {t("Riwayat Transaksi Pribadi", "Personal Transaction History")}
          </CardTitle>
          <span className="text-xs text-muted-foreground font-medium">
            {rows.length} {t("transaksi tercatat", "records")}
          </span>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <div className="divide-y rounded-lg border overflow-hidden">
              {rows.map((r) => {
                const category = categories.find((c) => c.id === r.categoryId);
                return (
                  <div
                    key={r.id}
                    className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{r.description}</span>
                        {category ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                            style={{ backgroundColor: `${category.color}15`, color: category.color }}
                          >
                            {category.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-muted text-muted-foreground">
                            {r.budgetBucket}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.date} {r.merchant ? `· ${r.merchant}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className={`text-sm font-bold tabular-nums ${r.transactionType === "allocation" ? "text-emerald-600" : ""}`}>
                        {money(r.amount, r.currency)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        <PersonalReceiptControl
                          transactionId={r.id}
                          hasReceipt={Boolean(r.receiptKey)}
                          label={{
                            upload: t("Struk", "Receipt"),
                            download: t("Unduh", "Download"),
                            remove: t("Hapus", "Remove"),
                          }}
                        />

                        <details className="relative">
                          <summary className="cursor-pointer list-none p-1.5 rounded-lg hover:bg-muted text-muted-foreground text-xs font-semibold">
                            ⋯
                          </summary>
                          <div className="absolute right-0 top-8 z-20 w-72 rounded-xl border bg-background p-3 shadow-lg">
                            <p className="text-xs font-bold mb-2">{t("Edit Transaksi", "Edit Transaction")}</p>
                            <form action={editTransaction} className="space-y-2">
                              <input type="hidden" name="id" value={r.id} />
                              <Input name="description" defaultValue={r.description} required className="h-8 text-xs" />
                              <Input name="merchant" defaultValue={r.merchant || ""} placeholder="Merchant" className="h-8 text-xs" />
                              <div className="grid grid-cols-2 gap-2">
                                <Input name="amount" defaultValue={r.amount} required className="h-8 text-xs" />
                                <Input name="currency" defaultValue={r.currency} required maxLength={3} className="h-8 text-xs" />
                              </div>
                              <Input name="date" type="date" defaultValue={r.date} required className="h-8 text-xs" />
                              <select name="categoryId" defaultValue={r.categoryId || ""} className="h-8 w-full rounded border bg-background px-2 text-xs">
                                <option value="">{t("Tanpa kategori", "No category")}</option>
                                {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                              </select>
                              <select name="budgetBucket" defaultValue={r.budgetBucket} className="h-8 w-full rounded border bg-background px-2 text-xs">
                                {["needs", "wants", "savings", "unbudgeted"].map((b) => <option key={b} value={b}>{b}</option>)}
                              </select>
                              <Button size="sm" variant="outline" className="w-full text-xs h-8">{t("Simpan", "Save")}</Button>
                            </form>
                            <form action={remove} className="mt-2 border-t pt-2">
                              <input type="hidden" name="id" value={r.id} />
                              <Button variant="ghost" size="sm" className="w-full text-xs h-7 text-destructive hover:text-destructive">
                                {t("Hapus Transaksi", "Delete Transaction")}
                              </Button>
                            </form>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("Belum ada transaksi pribadi.", "No personal transactions yet.")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
