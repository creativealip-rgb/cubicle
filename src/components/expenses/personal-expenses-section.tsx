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

export async function PersonalExpensesSection({
  month,
  t,
}: {
  month: string;
  t: (id: string, en: string) => string;
}) {
  const [rows, categories, budget] = await Promise.all([
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
      transactionType: String(fd.get("transactionType")) as
        "expense" | "allocation",
      budgetBucket: ((categoryId ? defaultBucketByCategory[categoryId] : null) ?? String(fd.get("budgetBucket"))) as
        "needs" | "wants" | "savings" | "unbudgeted",
      amount: String(fd.get("amount")),
      currency: String(fd.get("currency")),
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
  const money = (amount: string, currency: string) => new Intl.NumberFormat(locale, { style: "currency", currency }).format(Number(amount));
  const today = new Date().toISOString().slice(0, 10);
  const monthRows = rows.filter((row) => row.date.startsWith(month));
  const spent = monthRows.filter((row) => row.transactionType === "expense").reduce((sum, row) => sum + Number(row.amount), 0);
  const savings = monthRows.filter((row) => row.transactionType === "allocation").reduce((sum, row) => sum + Number(row.amount), 0);
  const income = Number(budget.budget?.income || 0);
  const categoryTotals = monthRows.reduce<Record<string, number>>((totals, row) => {
    const name = categories.find((category) => category.id === row.categoryId)?.name || t("Tanpa kategori", "Uncategorized");
    totals[name] = (totals[name] || 0) + Number(row.amount);
    return totals;
  }, {});
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">{t("Keuangan pribadi", "Personal Finance")}</h2>
        <p className="text-sm text-muted-foreground">{t("Pengeluaran dan tabungan pribadi tetap terpisah dari pengeluaran bisnis.", "Personal spending and savings stay separate from business expenses.")}</p>
      </div>
      <div data-ui="personal-finance-kpis" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [t("Pengeluaran bulan ini", "Spent this month"), money(String(spent), budget.budget?.currency || "IDR")],
          [t("Sisa anggaran", "Remaining budget"), budget.budget ? money(String(Math.max(0, income - spent)), budget.budget.currency) : "—"],
          [t("Tabungan dialokasikan", "Savings allocated"), money(String(savings), budget.budget?.currency || "IDR")],
          [t("Kategori terbesar", "Top category"), topCategory],
        ].map(([label, value]) => <Card key={label} className="rounded-xl"><CardContent className="p-4"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 truncate text-xl font-bold">{value}</p></CardContent></Card>)}
      </div>
      <PersonalFinanceDialog trigger={t("Kelola anggaran", "Manage budget")} title={t("Kelola anggaran", "Manage budget")} description={t("Atur pendapatan dan pembagian 50/30/20.", "Set income and your 50/30/20 split.")}>
        <PersonalBudgetSection month={month} t={t} compact />
      </PersonalFinanceDialog>
      <div className="grid gap-6 lg:grid-cols-2" data-ui="personal-finance-actions">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Tambah transaksi pribadi", "Add personal transaction")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={create} className="grid gap-3" data-ui="personal-quick-add">
              <Input
                name="description"
                required
                placeholder={t("Deskripsi", "Description")}
              />

              <Input
                name="amount"
                inputMode="decimal"
                required
                placeholder="0.00"
              />

              <select
                name="categoryId"
                className="h-10 rounded-md border bg-background px-3"
              >
                <option value="">{t("Tanpa kategori", "No category")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <details className="rounded-xl border p-3">
                <summary className="cursor-pointer text-sm font-medium">{t("Detail lainnya", "More details")}</summary>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Input name="merchant" placeholder={t("Merchant (opsional)", "Merchant (optional)")} />
                  <Input name="currency" required defaultValue={budget.budget?.currency || "IDR"} maxLength={3} />
                  <Input name="date" type="date" required defaultValue={today} />
                  <select name="transactionType" className="h-10 rounded-md border bg-background px-3"><option value="expense">{t("Pengeluaran", "Expense")}</option><option value="allocation">{t("Alokasi tabungan", "Savings allocation")}</option></select>
                  <select name="budgetBucket" className="h-10 rounded-md border bg-background px-3"><option value="needs">Needs</option><option value="wants">Wants</option><option value="savings">Savings</option><option value="unbudgeted">Unbudgeted</option></select>
                </div>
              </details>
              <Button className="rounded-xl">
                {t("Simpan transaksi", "Save transaction")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <PersonalFinanceDialog trigger={t("Kelola kategori", "Manage categories")} title={t("Kategori pribadi", "Personal categories")} description={t("Atur kategori dan bucket default.", "Manage categories and default buckets.")}>
        <Card className="border-0 shadow-none">
          <CardHeader>
            <CardTitle>
              {t("Kategori pribadi", "Personal categories")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createCategory} className="space-y-3">
              <Input
                name="name"
                required
                placeholder={t("Nama kategori", "Category name")}
              />
              <div className="flex items-center gap-3">
                <Input name="color" type="color" defaultValue="#64748b" aria-label={t("Warna kategori", "Category color")} className="h-10 w-14 shrink-0 cursor-pointer rounded-lg border p-1" />
                <span className="text-sm text-muted-foreground">{t("Warna kategori", "Category color")}</span>
              </div>
              <select
                name="defaultBucket"
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="savings">Savings</option>
                <option value="unbudgeted">Unbudgeted</option>
              </select>
              <Button className="w-full rounded-xl">{t("Tambah kategori", "Add category")}</Button>
            </form>
            <div className="mt-4 space-y-2">
              {categories.map((category) => (
                <form key={category.id} action={editCategory} className="grid gap-2 rounded-xl border p-2 sm:grid-cols-[1fr_auto_auto]">
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="color" value={category.color} />
                  <input type="hidden" name="defaultBucket" value={category.defaultBucket} />
                  <Input name="name" defaultValue={category.name} required />
                  <Button variant="outline">{t("Simpan", "Save")}</Button>
                  <Button formAction={removeCategory} variant="destructive">{t("Hapus", "Delete")}</Button>
                </form>
              ))}
            </div>
          </CardContent>
        </Card>
        </PersonalFinanceDialog>
      </div>
      <Card data-ui="personal-finance-history">
        <CardHeader>
          <CardTitle>
            {t("Transaksi terbaru", "Recent transactions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <div className="divide-y">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <details className="min-w-0 flex-1">
                    <summary className="cursor-pointer font-medium">{r.description}</summary>
                    <p className="text-sm text-muted-foreground">
                      {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${r.date}T00:00:00Z`))} · {r.budgetBucket} · {money(r.amount, r.currency)}
                    </p>
                    <form action={editTransaction} className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input type="hidden" name="id" value={r.id} />
                      <Input name="description" defaultValue={r.description} required />
                      <Input name="merchant" defaultValue={r.merchant || ""} />
                      <Input name="amount" defaultValue={r.amount} required />
                      <Input name="currency" defaultValue={r.currency} required maxLength={3} />
                      <Input name="date" type="date" defaultValue={r.date} required />
                      <select name="categoryId" defaultValue={r.categoryId || ""} className="h-10 rounded-md border bg-background px-3">
                        <option value="">{t("Tanpa kategori", "No category")}</option>
                        {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                      <select name="transactionType" defaultValue={r.transactionType} className="h-10 rounded-md border bg-background px-3">
                        <option value="expense">{t("Pengeluaran", "Expense")}</option>
                        <option value="allocation">{t("Alokasi", "Allocation")}</option>
                      </select>
                      <select name="budgetBucket" defaultValue={r.budgetBucket} className="h-10 rounded-md border bg-background px-3">
                        {["needs", "wants", "savings", "unbudgeted"].map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
                      </select>
                      <Button variant="outline">{t("Simpan perubahan", "Save changes")}</Button>
                    </form>
                  </details>
                  <div className="flex flex-wrap items-center gap-2">
                    <PersonalReceiptControl
                      transactionId={r.id}
                      hasReceipt={Boolean(r.receiptKey)}
                      label={{
                        upload: t("Unggah struk", "Upload receipt"),
                        download: t("Unduh struk", "Download receipt"),
                        remove: t("Hapus struk", "Remove receipt"),
                      }}
                    />
                    <form action={remove}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button variant="ghost" size="sm">
                        {t("Hapus", "Delete")}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>
              {t(
                "Belum ada transaksi pribadi.",
                "No personal transactions yet.",
              )}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
