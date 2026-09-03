"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/utils";
import { useT } from "@/lib/i18n-client";

interface BudgetDonutChartProps {
  needs: number;
  wants: number;
  savings: number;
  currencyCode: string;
}

export function BudgetDonutChart({
  needs,
  wants,
  savings,
  currencyCode,
}: BudgetDonutChartProps) {
  const { t } = useT();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const totalSpent = needs + wants + savings;
  const safeTotal = totalSpent > 0 ? totalSpent : 1;

  const data = [
    {
      label: t("Kebutuhan Pokok (Needs)", "Essential Needs"),
      shortLabel: "Needs (50%)",
      value: needs,
      pct: totalSpent > 0 ? Math.round((needs / safeTotal) * 100) : 0,
      targetPct: 50,
      color: "#3b82f6", // Blue
      lightColor: "bg-blue-500",
      textColor: "text-blue-500",
    },
    {
      label: t("Gaya Hidup & Keinginan (Wants)", "Lifestyle & Wants"),
      shortLabel: "Wants (30%)",
      value: wants,
      pct: totalSpent > 0 ? Math.round((wants / safeTotal) * 100) : 0,
      targetPct: 30,
      color: "#f59e0b", // Amber
      lightColor: "bg-amber-500",
      textColor: "text-amber-500",
    },
    {
      label: t("Tabungan & Investasi (Savings)", "Savings & Investments"),
      shortLabel: "Savings (20%)",
      value: savings,
      pct: totalSpent > 0 ? Math.round((savings / safeTotal) * 100) : 0,
      targetPct: 20,
      color: "#10b981", // Emerald
      lightColor: "bg-emerald-500",
      textColor: "text-emerald-500",
    },
  ];

  // SVG Donut calculation
  const size = 180;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-2">
      {/* Donut Chart with Center Summary */}
      <div className="relative flex items-center justify-center shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="transform -rotate-90"
        >
          {/* Background track */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/30"
          />

          {totalSpent === 0 ? (
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={strokeWidth}
              strokeDasharray={`${circumference} ${circumference}`}
              strokeDashoffset={0}
              className="opacity-20"
            />
          ) : (
            data.map((item, index) => {
              const itemRatio = item.value / safeTotal;
              const strokeLength = itemRatio * circumference;
              const spaceLength = circumference - strokeLength;
              const strokeOffset = -(accumulatedPercent * circumference);
              accumulatedPercent += itemRatio;

              const isHovered = hoveredIndex === index;

              return (
                <circle
                  key={item.shortLabel}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${strokeLength} ${spaceLength}`}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              );
            })
          )}
        </svg>

        {/* Center Label in Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
          {hoveredIndex !== null ? (
            <>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                {data[hoveredIndex].shortLabel}
              </span>
              <span className={`text-base font-bold tabular-nums ${data[hoveredIndex].textColor}`}>
                {data[hoveredIndex].pct}%
              </span>
              <span className="text-[10px] text-muted-foreground tabular-nums truncate max-w-[100px]">
                {formatMoney(String(data[hoveredIndex].value), currencyCode)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                {t("Total Alokasi", "Total Spent")}
              </span>
              <span className="text-sm font-bold tabular-nums text-foreground">
                {formatMoney(String(totalSpent), currencyCode)}
              </span>
              <span className="text-[10px] text-muted-foreground">
                100% (50/30/20)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend & Breakdown Cards */}
      <div className="flex-1 w-full space-y-2.5">
        {data.map((item, index) => {
          const isHovered = hoveredIndex === index;
          return (
            <div
              key={item.shortLabel}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                isHovered
                  ? "border-primary/50 bg-primary/5 shadow-sm"
                  : "bg-muted/15 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {item.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {t("Target Alokasi Ideal:", "Ideal Benchmark:")} {item.targetPct}%
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 font-medium pl-2">
                <p className="text-xs font-bold tabular-nums text-foreground">
                  {formatMoney(String(item.value), currencyCode)}
                </p>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {item.pct}% {t("dari belanja", "of total")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
