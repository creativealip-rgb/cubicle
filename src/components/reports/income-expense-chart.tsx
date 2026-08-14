import { formatMoney } from "@/lib/utils";

type Point = { key: string; label: string; income: number; expense: number };

type Props = { points: Point[]; currency: string; lang: string };

export function IncomeExpenseChart({ points, currency, lang }: Props) {
  const t = (id: string, en: string) => (lang === "en" ? en : id);
  const max = Math.max(
    1,
    ...points.flatMap((point) => [point.income, point.expense]),
  );
  const hasData = points.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <p className="min-h-40 rounded-lg bg-muted/35 px-4 py-10 text-center text-sm text-muted-foreground">
        {t(
          "Belum ada pemasukan atau pengeluaran pada periode ini.",
          "No income or expenses in this period yet.",
        )}
      </p>
    );
  }

  return (
    <div>
      <div
        className="mb-5 flex flex-wrap gap-4 text-xs text-muted-foreground"
        aria-hidden="true"
      >
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
          {t("Pemasukan", "Income")}
        </span>
        <span>
          <i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm bg-rose-400" />
          {t("Pengeluaran", "Expenses")}
        </span>
      </div>
      <div
        className="grid min-h-56 items-end gap-2 border-b border-border sm:gap-4"
        style={{
          gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
        }}
        role="img"
        aria-label={points
          .map(
            (p) =>
              `${p.label}: ${t("pemasukan", "income")} ${formatMoney(p.income, currency)}, ${t("pengeluaran", "expenses")} ${formatMoney(p.expense, currency)}`,
          )
          .join(". ")}
      >
        {points.map((point) => (
          <div
            key={point.key}
            className="flex min-w-0 flex-col items-center justify-end gap-2"
          >
            <div className="flex h-40 w-full items-end justify-center gap-1 sm:gap-2">
              <div
                tabIndex={0}
                title={`${t("Pemasukan", "Income")}: ${formatMoney(point.income, currency)}`}
                aria-label={`${point.label}, ${t("pemasukan", "income")} ${formatMoney(point.income, currency)}`}
                className="w-[35%] min-w-2 rounded-t bg-emerald-500 outline-none ring-emerald-300 focus:ring-2"
                style={{
                  height:
                    point.income > 0
                      ? `${Math.max(3, (point.income / max) * 100)}%`
                      : 0,
                }}
              />
              <div
                tabIndex={0}
                title={`${t("Pengeluaran", "Expenses")}: ${formatMoney(point.expense, currency)}`}
                aria-label={`${point.label}, ${t("pengeluaran", "expenses")} ${formatMoney(point.expense, currency)}`}
                className="w-[35%] min-w-2 rounded-t bg-rose-400 outline-none ring-rose-300 focus:ring-2"
                style={{
                  height:
                    point.expense > 0
                      ? `${Math.max(3, (point.expense / max) * 100)}%`
                      : 0,
                }}
              />
            </div>
            <span className="w-full truncate pb-2 text-center text-[10px] text-muted-foreground sm:text-xs">
              {point.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
