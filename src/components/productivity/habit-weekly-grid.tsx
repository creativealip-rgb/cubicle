"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EditHabitDialog } from "@/components/productivity/edit-habit-dialog";
import { useAppTransition } from "@/lib/transition-provider";

export interface HabitItem {
  id: string;
  name: string;
  startDate: string;
  frequency: "daily" | "specific_weekdays" | string;
  weekdays: number[];
  goalId?: string | null;
  status: string;
  checkins: Array<{ localDate: string }>;
}

interface HabitWeeklyGridProps {
  habits: HabitItem[];
  today: string;
  lang?: string;
  goals?: { id: string; title: string }[];
}

export function HabitWeeklyGrid({
  habits,
  today,
  lang = "id",
  goals = [],
}: HabitWeeklyGridProps) {
  const { refresh } = useAppTransition();
  const [weekOffset, setWeekOffset] = useState(0);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [editingHabit, setEditingHabit] = useState<HabitItem | null>(null);

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
      isFuture: boolean;
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
        isFuture: dateStr > today,
      });
    }

    return {
      weekDays: days,
      monthYearLabel: Array.from(monthNames).join(" - "),
    };
  }, [today, weekOffset, lang]);

  const handleToggle = async (h: HabitItem, date: string, isFuture: boolean) => {
    if (isFuture) {
      toast.error(
        lang === "id"
          ? "Tidak bisa check-in tanggal yang belum terjadi"
          : "Future check-ins are not allowed"
      );
      return;
    }

    const key = `${h.id}-${date}`;
    if (pendingId === key) return;

    // Optimistic UI update
    setOptimisticCheckins((prev) => {
      const set = new Set(prev[h.id] || []);
      if (set.has(date)) {
        set.delete(date);
      } else {
        set.add(date);
      }
      return { ...prev, [h.id]: set };
    });

    setPendingId(key);
    try {
      const res = await fetch("/api/productivity/habits/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId: h.id, date }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update check-in");
      }
    } catch (err) {
      // Revert on error
      setOptimisticCheckins((prev) => {
        const original = new Set(
          habits.find((item) => item.id === h.id)?.checkins.map((c) => c.localDate) || []
        );
        return { ...prev, [h.id]: original };
      });
      toast.error(err instanceof Error ? err.message : "Gagal update check-in");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <>
      <EditHabitDialog
        habit={editingHabit}
        open={Boolean(editingHabit)}
        onOpenChange={(open) => !open && setEditingHabit(null)}
        lang={lang}
        goals={goals}
        onSaved={refresh}
      />

      <div className="space-y-2.5">
        {/* Header navigasi Minggu & Bulan */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50/50 px-3 py-2">
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
                {lang === "id" ? "Hari Ini" : "Today"}
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
          <div className="min-w-[580px]">
            {/* Header Hari (Senin - Minggu) */}
            <div className="grid grid-cols-[minmax(180px,1fr)_repeat(7,48px)] items-center border-b border-slate-100 bg-slate-50/80 px-3 py-2 text-xs font-semibold text-slate-600">
              <span className="flex items-center h-full text-slate-700">
                {lang === "id" ? "Nama Kebiasaan" : "Habit Name"}
              </span>
              {weekDays.map((d) => (
                <div
                  key={d.date}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg py-1",
                    d.isToday && "bg-primary/10 text-primary font-bold"
                  )}
                >
                  <span className="text-[10px] uppercase tracking-wider">{d.dayName}</span>
                  <span className="text-xs font-semibold">{d.dayNum}</span>
                </div>
              ))}
            </div>

            {/* Baris List Habit */}
            <div className="divide-y divide-slate-100">
              {habits.map((h) => (
                <div
                  key={`row-${h.id}`}
                  className="grid grid-cols-[minmax(180px,1fr)_repeat(7,48px)] items-center px-3 py-2 transition hover:bg-slate-50/50"
                >
                  {/* Klik nama habit langsung membuka dialog edit habit */}
                  <div className="flex items-center min-h-[32px] pr-3">
                    <button
                      type="button"
                      onClick={() => setEditingHabit(h)}
                      className="group/name flex items-center gap-1.5 truncate text-left text-xs font-semibold text-slate-800 hover:text-primary transition"
                      title={lang === "id" ? "Klik untuk edit habit" : "Click to edit habit"}
                    >
                      <span className="truncate group-hover/name:underline">{h.name}</span>
                    </button>
                  </div>

                  {weekDays.map((d) => {
                    const done = optimisticCheckins[h.id]?.has(d.date) ?? false;
                    const key = `${h.id}-${d.date}`;
                    const isThisPending = pendingId === key;

                    return (
                      <div key={d.date} className="flex justify-center items-center">
                        <button
                          type="button"
                          onClick={() => handleToggle(h, d.date, d.isFuture)}
                          aria-label={`${h.name} ${d.date}`}
                          disabled={d.isFuture || isThisPending}
                          className={cn(
                            "flex size-6 items-center justify-center rounded-md border transition-all duration-150 active:scale-90",
                            done
                              ? "border-emerald-600 bg-emerald-500 text-white shadow-xs"
                              : d.isFuture
                                ? "border-slate-100 bg-slate-50 text-transparent opacity-40 cursor-not-allowed"
                                : "border-slate-200 bg-white hover:border-primary/50 text-transparent cursor-pointer",
                            d.isToday && !done && "border-dashed border-primary/50 ring-1 ring-primary/20"
                          )}
                        >
                          {done && <Check className="h-3.5 w-3.5 stroke-[3]" />}
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
    </>
  );
}
