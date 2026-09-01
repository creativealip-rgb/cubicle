import {
  createPersonalTransaction,
  createPersonalTransactionCategory,
  deletePersonalTransaction,
  listPersonalTransactionCategories,
  listPersonalTransactions,
} from "@/lib/actions/personal-transactions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PersonalBudgetSection } from "./personal-budget-section";
import { PersonalReceiptControl } from "./personal-receipt-control";

export async function PersonalExpensesSection({
  month,
  t,
}: {
  month: string;
  t: (id: string, en: string) => string;
}) {
  const [rows, categories] = await Promise.all([
    listPersonalTransactions(),
    listPersonalTransactionCategories(),
  ]);
  async function create(fd: FormData) {
    "use server";
    await createPersonalTransaction({
      categoryId: String(fd.get("categoryId") || "") || null,
      transactionType: String(fd.get("transactionType")) as
        "expense" | "allocation",
      budgetBucket: String(fd.get("budgetBucket")) as
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
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="space-y-6">
      <PersonalBudgetSection month={month} t={t} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              {t("Tambah transaksi pribadi", "Add personal transaction")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={create} className="grid gap-3 sm:grid-cols-2">
              <Input
                name="description"
                required
                placeholder={t("Deskripsi", "Description")}
              />
              <Input
                name="merchant"
                placeholder={t("Merchant (opsional)", "Merchant (optional)")}
              />
              <Input
                name="amount"
                inputMode="decimal"
                required
                placeholder="0.00"
              />
              <Input
                name="currency"
                required
                defaultValue="IDR"
                maxLength={3}
              />
              <Input name="date" type="date" required defaultValue={today} />
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
              <select
                name="transactionType"
                className="h-10 rounded-md border bg-background px-3"
              >
                <option value="expense">{t("Pengeluaran", "Expense")}</option>
                <option value="allocation">
                  {t("Alokasi tabungan", "Savings allocation")}
                </option>
              </select>
              <select
                name="budgetBucket"
                className="h-10 rounded-md border bg-background px-3"
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="savings">Savings</option>
                <option value="unbudgeted">Unbudgeted</option>
              </select>
              <Button className="sm:col-span-2">
                {t("Simpan transaksi", "Save transaction")}
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
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
              <Input name="color" type="color" defaultValue="#64748b" />
              <select
                name="defaultBucket"
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="needs">Needs</option>
                <option value="wants">Wants</option>
                <option value="savings">Savings</option>
                <option value="unbudgeted">Unbudgeted</option>
              </select>
              <Button>{t("Tambah kategori", "Add category")}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>
            {t("Transaksi pribadi", "Personal transactions")}
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
                  <div>
                    <p className="font-medium">{r.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.date} · {r.budgetBucket} · {r.currency} {r.amount}
                    </p>
                  </div>
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
