import {
  copyPreviousPersonalBudget,
  getPersonalBudget,
  setPersonalBudgetEnabled,
  upsertPersonalBudget,
} from "@/lib/actions/personal-budget";
import { budgetTargets } from "@/lib/personal-productivity/budget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export async function PersonalBudgetSection({
  month,
  t,
}: {
  month: string;
  t: (id: string, en: string) => string;
}) {
  const data = await getPersonalBudget(month),
    targets = data.budget
      ? budgetTargets(
          data.budget.income,
          data.budget.needsPct,
          data.budget.wantsPct,
          data.budget.savingsPct,
        )
      : null;
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
  const rows = targets
    ? [
        { key: "needs", target: targets.needs, actual: data.actual.needs },
        { key: "wants", target: targets.wants, actual: data.actual.wants },
        {
          key: "savings",
          target: targets.savings,
          actual: data.actual.savings,
        },
      ]
    : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("Anggaran 50/30/20", "50/30/20 budget")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={save} className="space-y-3">
            <Input name="month" type="month" required defaultValue={month} />
            <Input
              name="monthlyIncome"
              required
              inputMode="decimal"
              defaultValue={data.budget?.income || "0.00"}
              placeholder={t("Pendapatan bulanan", "Monthly income")}
            />
            <Input
              name="currency"
              required
              maxLength={3}
              defaultValue={data.budget?.currency || "IDR"}
            />
            <div className="grid grid-cols-3 gap-2">
              <Input
                name="needsPercent"
                required
                defaultValue={data.budget?.needsPct || "50.00"}
              />
              <Input
                name="wantsPercent"
                required
                defaultValue={data.budget?.wantsPct || "30.00"}
              />
              <Input
                name="savingsPercent"
                required
                defaultValue={data.budget?.savingsPct || "20.00"}
              />
            </div>
            <Button className="w-full">
              {t("Simpan anggaran", "Save budget")}
            </Button>
          </form>
          <form action={copy} className="mt-2">
            <input type="hidden" name="month" value={month} />
            <input
              type="hidden"
              name="currency"
              value={data.budget?.currency || "IDR"}
            />
            <Button variant="outline" className="w-full">
              {t("Salin bulan sebelumnya", "Copy previous month")}
            </Button>
          </form>
          {data.budget && (
            <form action={toggle} className="mt-2">
              <input type="hidden" name="month" value={month} />
              <input
                type="hidden"
                name="currency"
                value={data.budget.currency}
              />
              <input
                type="hidden"
                name="enabled"
                value={String(!data.budget.enabled)}
              />
              <Button variant="ghost" className="w-full">
                {data.budget.enabled
                  ? t("Nonaktifkan anggaran", "Disable budget")
                  : t("Aktifkan anggaran", "Enable budget")}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("Target dan aktual", "Targets and actuals")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length ? (
            <div className="space-y-4">
              {rows.map((row) => {
                const percent = Number(row.target)
                  ? Math.min(
                      100,
                      Math.round(
                        (Number(row.actual) / Number(row.target)) * 100,
                      ),
                    )
                  : 0;
                return (
                  <div key={row.key}>
                    <div className="flex justify-between text-sm">
                      <span className="capitalize">{row.key}</span>
                      <span>
                        {data.budget?.currency} {row.actual} / {row.target}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p
                      className={`mt-1 text-xs ${Number(row.actual) > Number(row.target) ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {Number(row.actual) > Number(row.target)
                        ? t("Melebihi target", "Over budget")
                        : `${t("Sisa", "Remaining")}: ${data.budget?.currency} ${(Number(row.target) - Number(row.actual)).toFixed(2)}`}
                    </p>
                  </div>
                );
              })}
              {data.actual.unbudgeted !== "0.00" && (
                <p className="text-sm text-amber-600">
                  Unbudgeted: {data.budget?.currency} {data.actual.unbudgeted}
                </p>
              )}
              {data.excludedCurrencies.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Mata uang lain tidak dihitung:",
                    "Other currencies excluded:",
                  )}{" "}
                  {data.excludedCurrencies.join(", ")}
                </p>
              )}
            </div>
          ) : (
            <p>{t("Atur anggaran bulan ini.", "Set this month's budget.")}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
