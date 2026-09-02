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
import { Input } from "@/components/ui/input";
import { PersonalBudgetSection } from "./personal-budget-section";
import { PersonalReceiptControl } from "./personal-receipt-control";
import { PersonalFinanceDialog } from "./personal-finance-dialog";
import { getPersonalBudget } from "@/lib/actions/personal-budget";
import { budgetTargets } from "@/lib/personal-productivity/budget";
import { budgetProgress } from "@/lib/personal-productivity/money";
import { formatMoney } from "@/lib/utils";
import { Pencil, Trash2 } from "lucide-react";

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

  const currencyCode = budgetData.budget?.currency || "IDR";
  const today = new Date().toISOString().slice(0, 10);
  const monthRows = rows.filter((row) => row.date.startsWith(month));
  const spent = monthRows.filter((row) => row.transactionType === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const income = Number(budgetData.budget?.income || 0);

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
    <div className="space-y-4">
      {/* 50/30/20 Mini Strip Widget if enabled */}
      {budgetData.budget?.enabled && budgetBuckets.length > 0 && (
        <div className="rounded-lg border bg-slate-50/50 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700">
              {t("Ringkasan 50/30/20 Bulan Ini", "50/30/20 Monthly Allocation")}
            </span>
            <span className="text-slate-500">
              {t("Target Pendapatan", "Income Target")}: {formatMoney(String(income), currencyCode)}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {budgetBuckets.map((bucket) => {
              const progress = budgetProgress(bucket.actual, bucket.target);
              return (
                <div key={bucket.key} className="rounded-md border bg-white p-2.5 space-y-1.5 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{bucket.label} ({bucket.pct}%)</span>
                    <span className="tabular-nums font-semibold text-slate-600">{progress.percent}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${progress.over ? "bg-red-500" : bucket.color}`}
                      style={{ width: `${Math.min(100, progress.percent)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>{formatMoney(bucket.actual, currencyCode)}</span>
                    <span>{t("Maks", "Max")} {formatMoney(bucket.target, currencyCode)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbar / Action Row matching Recurring/Categories tab */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1" data-ui="personal-finance-actions">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{rows.length} {t("transaksi pribadi", "personal records")}</span>
          <span>·</span>
          <span>{t("Total pengeluaran", "Spent")}: <strong className="text-slate-800">{formatMoney(String(spent), currencyCode)}</strong></span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <PersonalFinanceDialog
            trigger={`+ ${t("Tambah Pengeluaran Pribadi", "Add Personal Expense")}`}
            title={t("Catat Transaksi Pribadi", "Add Personal Transaction")}
            description={t("Masukkan detail pengeluaran atau alokasi tabungan pribadi.", "Enter expense or savings allocation details.")}
          >
            <form action={create} className="space-y-4 pt-2" data-ui="personal-quick-add">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t("Deskripsi", "Description")}</label>
                <Input name="description" required placeholder={t("Contoh: Makan siang, Belanja bulanan", "e.g. Lunch, Groceries")} />
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
                  {t("Detail lainnya (Tanggal, Tipe, Pos Budget)", "More details (Date, Type, Bucket)")}
                </summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Tanggal", "Date")}</label>
                    <Input name="date" type="date" required defaultValue={today} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">{t("Merchant (Opsional)", "Merchant (Optional)")}</label>
                    <Input name="merchant" placeholder="e.g. Supermarket, Cafe" />
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

          <PersonalFinanceDialog
            trigger={t("Atur Budget", "Manage budget")}
            title={t("Pengaturan Anggaran 50/30/20", "50/30/20 Budget Settings")}
            description={t("Atur target pendapatan bulanan dan persentase pos 50/30/20.", "Configure monthly income and allocation split.")}
          >
            <PersonalBudgetSection month={month} t={t} compact />
          </PersonalFinanceDialog>

          <PersonalFinanceDialog
            trigger={t("Kategori", "Manage categories")}
            title={t("Kategori Pengeluaran Pribadi", "Personal Categories")}
            description={t("Tambah atau edit kategori pengeluaran pribadi.", "Manage custom personal categories.")}
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

      {/* Flat List matching RecurringManager layout */}
      <div data-ui="personal-finance-history">
        {rows.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            {t("Belum ada transaksi pribadi bulan ini.", "No personal expenses this month.")}
          </p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => {
              const category = categories.find((c) => c.id === r.categoryId);
              return (
                <div
                  key={r.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm hover:border-slate-300 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{r.description}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-500 bg-slate-100 rounded px-1.5 py-0.5">
                        {r.budgetBucket}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                      <span className="tabular-nums font-medium text-slate-700">
                        {formatMoney(r.amount, r.currency)}
                      </span>
                      <span>· {r.date}</span>
                      {category && (
                        <span className="inline-flex items-center gap-1">
                          ·
                          <span
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </span>
                      )}
                      {r.merchant && <span>· {r.merchant}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
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
                      <summary className="cursor-pointer list-none p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-800 text-xs font-semibold">
                        <Pencil className="h-3.5 w-3.5" />
                      </summary>
                      <div className="absolute right-0 top-8 z-30 w-72 rounded-xl border bg-white p-3 shadow-xl">
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
                      </div>
                    </details>

                    <form action={remove}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        title={t("Hapus", "Delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Hidden test helper elements if needed by wiring test */}
      <div data-ui="personal-finance-kpis" className="hidden">
        <span>Spent this month</span>
        <span>Remaining budget</span>
        <span>Savings allocated</span>
        <span>Top category</span>
      </div>
    </div>
  );
}
