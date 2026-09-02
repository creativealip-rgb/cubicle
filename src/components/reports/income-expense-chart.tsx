"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";

export type ChartPoint = {
  key: string;
  label: string;
  income: number;
  expense: number;
  net?: number;
};

type Props = {
  points: ChartPoint[];
  currency: string;
  lang: string;
};

export function IncomeExpenseChart({ points, currency, lang }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const t = (id: string, en: string) => (lang === "en" ? en : id);

  const totalIncome = points.reduce((acc, p) => acc + p.income, 0);
  const totalExpense = points.reduce((acc, p) => acc + p.expense, 0);
  const totalNet = totalIncome - totalExpense;

  const maxVal = Math.max(
    1,
    ...points.flatMap((p) => [p.income, p.expense]),
  );

  const hasData = points.some((p) => p.income > 0 || p.expense > 0);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-12 text-center">
        <p className="text-sm font-medium text-foreground">
          {t("Belum ada data transaksi", "No transaction data")}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(
            "Pemasukan dari invoice lunas dan pengeluaran pada periode ini akan muncul di sini.",
            "Paid invoices and expenses in this period will appear here.",
          )}
        </p>
      </div>
    );
  }

  const activePoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="space-y-4">
      {/* Header Legend & Quick Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs border-b pb-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 shadow-xs" />
            {t("Pemasukan", "Income")}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-2.5 w-2.5 rounded-sm bg-rose-500 shadow-xs" />
            {t("Pengeluaran", "Expenses")}
          </span>
          <span className="flex items-center gap-1.5 font-medium text-foreground">
            <span className="h-1.5 w-3 rounded-full bg-blue-500 shadow-xs" />
            {t("Bersih (Net)", "Net Profit")}
          </span>
        </div>

        {/* Dynamic Hover Tooltip / Status */}
        <div className="text-xs font-semibold tabular-nums text-muted-foreground">
          {activePoint ? (
            <span className="text-foreground animate-in fade-in">
              {activePoint.label}:{" "}
              <span className="text-emerald-600 font-bold">+{formatMoney(activePoint.income, currency)}</span>
              {" · "}
              <span className="text-rose-600 font-bold">-{formatMoney(activePoint.expense, currency)}</span>
              {" = "}
              <span className={activePoint.income - activePoint.expense >= 0 ? "text-blue-600 font-bold" : "text-amber-600 font-bold"}>
                {formatMoney(activePoint.income - activePoint.expense, currency)}
              </span>
            </span>
          ) : (
            <span>
              {t("Total Net", "Total Net")}:{" "}
              <span className={totalNet >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                {formatMoney(totalNet, currency)}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Interactive Bar & Net Chart */}
      <div className="relative pt-4">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-dashed border-foreground w-full" />
          <div className="border-b border-foreground w-full" />
        </div>

        {/* Bars Container */}
        <div
          className="relative grid min-h-52 items-end gap-1.5 sm:gap-3 z-10"
          style={{
            gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))`,
          }}
        >
          {points.map((point, i) => {
            const incomeHeight = point.income > 0 ? Math.max(6, (point.income / maxVal) * 100) : 0;
            const expenseHeight = point.expense > 0 ? Math.max(6, (point.expense / maxVal) * 100) : 0;
            const pointNet = point.income - point.expense;
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={point.key}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`group flex min-w-0 flex-col items-center justify-end gap-2 cursor-pointer transition-all rounded-lg p-1 ${
                  isHovered ? "bg-muted/60 ring-1 ring-border" : "hover:bg-muted/30"
                }`}
              >
                {/* Visual Bars */}
                <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5 relative">
                  {/* Net Indicator Dot */}
                  {(point.income > 0 || point.expense > 0) && (
                    <div
                      className={`absolute -top-3 w-2 h-2 rounded-full border border-background shadow-xs transition-transform ${
                        pointNet >= 0 ? "bg-blue-500" : "bg-amber-500"
                      } ${isHovered ? "scale-150 ring-2 ring-blue-300" : ""}`}
                      title={`${t("Bersih", "Net")}: ${formatMoney(pointNet, currency)}`}
                    />
                  )}

                  {/* Income Bar */}
                  <div
                    className={`w-[40%] min-w-2 rounded-t-md bg-emerald-500 transition-all duration-300 ${
                      isHovered ? "bg-emerald-600 shadow-md brightness-110" : ""
                    }`}
                    style={{ height: `${incomeHeight}%` }}
                  />

                  {/* Expense Bar */}
                  <div
                    className={`w-[40%] min-w-2 rounded-t-md bg-rose-500 transition-all duration-300 ${
                      isHovered ? "bg-rose-600 shadow-md brightness-110" : ""
                    }`}
                    style={{ height: `${expenseHeight}%` }}
                  />
                </div>

                {/* X-Axis Label */}
                <span className={`w-full truncate text-center text-[11px] font-medium transition-colors ${
                  isHovered ? "text-foreground font-bold" : "text-muted-foreground"
                }`}>
                  {point.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Breakdown Mini-Strip */}
      <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted/40 p-3 text-center border text-xs sm:text-sm">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("Total Pemasukan", "Total Income")}</p>
          <p className="mt-0.5 font-bold text-emerald-600 truncate tabular-nums">
            +{formatMoney(totalIncome, currency)}
          </p>
        </div>
        <div className="min-w-0 border-x border-border/80">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("Total Biaya", "Total Expenses")}</p>
          <p className="mt-0.5 font-bold text-rose-600 truncate tabular-nums">
            -{formatMoney(totalExpense, currency)}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{t("Rasio Margin", "Margin Ratio")}</p>
          <p className={`mt-0.5 font-bold truncate tabular-nums ${totalNet >= 0 ? "text-blue-600" : "text-amber-600"}`}>
            {totalIncome > 0 ? `${Math.round((totalNet / totalIncome) * 100)}%` : "0%"}
          </p>
        </div>
      </div>
    </div>
  );
}
