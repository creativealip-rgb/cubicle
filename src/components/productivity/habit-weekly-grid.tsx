"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HabitItem {
  id: string;
  name: string;
  status: string;
  checkins: Array<{ localDate: string }>;
}

interface HabitWeeklyGridProps {
  habits: HabitItem[];
  today: string;
  lang?: string;
  toggleAction: (habitId: string, date: string) => Promise<void>;
}

export function HabitWeeklyGrid({
  habits,
  today,
  lang = "id",
  toggleAction,
}: HabitWeeklyGridProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [optimisticCheckins, setOptimisticCheckins] = useState<
    Record<string, Set<string>>
  >(() => {
    const map: Record<string, Set<string>> = {};
    for (const h of habits) {
      map[h.id] = new Set(h.checkins.map((c) => c.localDate));
    }
    return map;
  });

  const { weekDays, monthYearLabel } = useMemo(() => {
    const curr = new Date(`${today}T12:00:00Z`);
    const dayOfWeek = curr.getUTCDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setUTCDate(curr.getUTCDate() + diffToMonday + weekOffset * 7);

    const days: Array<{
      date: string;
      dayName: string;
      dayNum: number;
      isToday: boolean;
    }> = [];

    const monthNames = new Set<string>();

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      
      const dayName = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
        weekday: "short",
        timeZone: "UTC",
      }).format(d);

      const mName = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }).format(d);
      monthNames.add(mName);

      days.push({
        date: dateStr,
        dayName,
        dayNum: d.getUTCDate(),
        isToday: dateStr === today,
      });
    }

    return {
      weekDays: days,
      monthYearLabel: Array.from(monthNames).join(" - "),
    };
  }, [today, weekOffset, lang]);

  const handleToggle = (habitId: string, date: string) => {
    setOptimisticCheckins((prev) => {
      const set = new Set(prev[habitId] || []);
      if (set.has(date)) {
        set.delete(date);
      } else {
        set.add(date);
      }
      return { ...prev, [habitId]: set };
    });

    startTransition(async () => {
      try {
        await toggleAction(habitId, date);
      } catch {
        setOptimisticCheckins((prev) => {
          const original = new Set(
            habits.find((h) => h.id === habitId)?.checkins.map((c) => c.localDate) || []
          );
          return { ...prev, [habitId]: original };
        });
      }
    });
  };

  return (
    <div className="space-y-3">
      {/* Header navigasi Minggu & Bulan */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 sm:px-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-900 capitalize">
            {monthYearLabel}
          </span>
          {weekOffset !== 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setWeekOffset(0)}
              className="h-6 rounded-md px-2 text-[11px] font-semibold text-primary hover:bg-primary/10"
            >
              {lang === "id" ? "Kembali ke Hari Ini" : "Today"}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((p) => p - 1)}
            className="h-7 w-7 p-0 rounded-lg"
            title={lang === "id" ? "Minggu sebelumnya" : "Previous week"}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setWeekOffset((p) => p + 1)}
            className="h-7 w-7 p-0 rounded-lg"
            title={lang === "id" ? "Minggu berikutnya" : "Next week"}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid Tabel Habit */}
      <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white shadow-xs">
        <div className="min-w-[620px]">
          {/* Header Hari (Senin - Minggu) */}
          <div className="grid grid-cols-[minmax(200px,1fr)_repeat(7,64px)] border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-600">
            <span>{lang === "id" ? "Nama Kebiasaan" : "Habit Name"}</span>
            {weekDays.map((d) => (
              <div
                key={d.date}
                className={cn(
                  "flex flex-col items-center justify-center rounded-md py-0.5",
                  d.isToday && "bg-primary/10 text-primary font-bold"
                )}
              >
                <span className="text-[10px] uppercase">{d.dayName}</span>
                <span className="text-[11px]">{d.dayNum}</span>
              </div>
            ))}
          </div>

          {/* Baris List Habit */}
          <div className="divide-y divide-slate-100">
            {habits.map((h) => (
              <div
                key={`row-${h.id}`}
                className="grid grid-cols-[minmax(200px,1fr)_repeat(7,64px)] items-center px-3 py-2.5 transition hover:bg-slate-50/40"
              >
                <span className="truncate pr-3 text-xs font-semibold text-slate-800">
                  {h.name}
                </span>
                {weekDays.map((d) => {
                  const done = optimisticCheckins[h.id]?.has(d.date) ?? false;
                  return (
                    <div key={d.date} className="flex justify-center">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggle(h.id, d.date)}
                        aria-label={`${h.name} ${d.date}`}
                        className={cn(
                          "flex size-7 items-center justify-center rounded-lg border text-xs transition-all duration-150 active:scale-90",
                          done
                            ? "border-emerald-600 bg-emerald-500 text-white shadow-xs"
                            : "border-slate-200 bg-white hover:border-primary/50 text-transparent",
                          d.isToday && !done && "border-dashed border-primary/40"
                        )}
                      >
                        {done && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
