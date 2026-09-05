"use client";

import { useMemo } from "react";

interface MiniDonutProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export function MiniDonut({
  percentage,
  size = 48,
  strokeWidth = 4.5,
  label,
}: MiniDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const color = useMemo(() => {
    if (percentage >= 80) return "text-emerald-500";
    if (percentage >= 50) return "text-primary";
    if (percentage > 0) return "text-amber-500";
    return "text-muted-foreground/40";
  }, [percentage]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-muted/30"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-bold tabular-nums text-foreground">
          {percentage}%
        </span>
        {label && <span className="text-[8px] text-muted-foreground">{label}</span>}
      </div>
    </div>
  );
}
