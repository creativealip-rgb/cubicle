import {
  copyPreviousPersonalBudget,
  getPersonalBudget,
  setPersonalBudgetEnabled,
  upsertPersonalBudget,
} from "@/lib/actions/personal-budget";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export async function PersonalBudgetSection({
  month,
  t,
}: {
  month: string;
  t: (id: string, en: string) => string;
  compact?: boolean;
}) {
  const data = await getPersonalBudget(month);

  async function save(fd: FormData) {
    "use server";
    await upsertPersonalBudget({
      month: String(fd.get("month")),
      monthlyIncome: String(fd.get("monthlyIncome")),
      currency: String(fd.get("currency")),
      needsPercent: String(fd.get("needsPercent")),
      wantsPercent: String(fd.get("wantsPercent")),
      savingsPercent: String(fd.get("savingsPercent")),
    });
  }

  async function copy(fd: FormData) {
    "use server";
    await copyPreviousPersonalBudget(
      String(fd.get("month")),
      String(fd.get("currency") || data.budget?.currency || "IDR"),
      fd.get("replace") === "true",
    );
  }

  async function toggle(fd: FormData) {
    "use server";
    await setPersonalBudgetEnabled(
      String(fd.get("month")),
      String(fd.get("currency")),
      fd.get("enabled") === "true",
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <form action={save} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Bulan", "Month")}</label>
            <Input name="month" type="month" required defaultValue={month} className="h-9 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">{t("Mata Uang", "Currency")}</label>
            <select
              name="currency"
              required
              defaultValue={data.budget?.currency || data.currencies[0] || "IDR"}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              {[...new Set(["IDR", "USD", ...data.currencies])].map((currency) => (
                <option key={currency} value={currency}>{currency}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("Target Pendapatan Bulanan", "Monthly Income Target")}</label>
          <Input
            name="monthlyIncome"
            required
            inputMode="decimal"
            defaultValue={data.budget?.income ? Number(data.budget.income).toString() : ""}
            placeholder="e.g. 12000000"
            className="h-9 text-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">{t("Pembagian Alokasi 50/30/20", "50/30/20 Allocation Split")}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              ["needs-percent", "needsPercent", t("Kebutuhan (Needs)", "Needs"), data.budget?.needsPct || "50.00"],
              ["wants-percent", "wantsPercent", t("Keinginan (Wants)", "Wants"), data.budget?.wantsPct || "30.00"],
              ["savings-percent", "savingsPercent", t("Tabungan (Savings)", "Savings"), data.budget?.savingsPct || "20.00"],
            ].map(([id, name, label, value]) => (
              <div key={id} className="space-y-1 rounded-lg border p-2 bg-muted/20 text-center">
                <span className="text-[11px] font-medium text-muted-foreground block truncate">{label}</span>
                <div className="flex items-center justify-center gap-1">
                  <Input
                    id={id}
                    name={name}
                    required
                    inputMode="decimal"
                    defaultValue={value}
                    className="h-8 text-xs text-center px-1 font-semibold"
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Button className="w-full rounded-xl">
          {t("Simpan Pengaturan Anggaran", "Save Budget Settings")}
        </Button>
      </form>

      <div className="border-t pt-3 space-y-2">
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground font-medium py-1">
            {t("Opsi Lanjutan & Salin Bulan Lalu", "Advanced & Copy Options")}
          </summary>
          <div className="pt-2 space-y-2">
            <form action={copy}>
              <input type="hidden" name="month" value={month} />
              <input type="hidden" name="currency" value={data.budget?.currency || "IDR"} />
              <Button variant="outline" size="sm" className="w-full text-xs">
                {t("Salin konfigurasi dari bulan sebelumnya", "Copy from previous month")}
              </Button>
            </form>

            {data.budget && (
              <form action={copy}>
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="currency" value={data.budget.currency} />
                <input type="hidden" name="replace" value="true" />
                <Button variant="destructive" size="sm" className="w-full text-xs">
                  {t("Ganti paksa dengan data bulan sebelumnya", "Force replace with previous month")}
                </Button>
              </form>
            )}

            {data.budget && (
              <form action={toggle}>
                <input type="hidden" name="month" value={month} />
                <input type="hidden" name="currency" value={data.budget.currency} />
                <input type="hidden" name="enabled" value={String(!data.budget.enabled)} />
                <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                  {data.budget.enabled
                    ? t("Nonaktifkan pantauan anggaran", "Disable budget tracking")
                    : t("Aktifkan pantauan anggaran", "Enable budget tracking")}
                </Button>
              </form>
            )}
          </div>
        </details>
      </div>
    </div>
  );
}
