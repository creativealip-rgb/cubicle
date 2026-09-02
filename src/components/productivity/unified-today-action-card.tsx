"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UnifiedTodayActionCardProps {
  scheduledHabitsCount: number;
  completedHabitsCount: number;
  uncompletedHabits: { id: string; name: string }[];
  activeGoalsCount?: number;
  goals: {
    id: string;
    title: string;
    progress: number;
    nextStep: { id: string; title: string } | null;
  }[];
  checkHabit: (formData: FormData) => Promise<void>;
  updateGoal: (formData: FormData) => Promise<void>;
  lang: "id" | "en";
  t: (id: string, en: string) => string;
}

export function UnifiedTodayActionCard({
  scheduledHabitsCount,
  completedHabitsCount,
  uncompletedHabits,
  goals,
  checkHabit,
  updateGoal,
  lang,
  t,
}: UnifiedTodayActionCardProps) {
  const [selectedGoalId, setSelectedGoalId] = useState(goals[0]?.id ?? "");
  const [statusMsg, setStatusMsg] = useState("");
  const [pending, setPending] = useState(false);

  const selectedGoal = goals.find((g) => g.id === selectedGoalId);
  const allHabitsDone =
    scheduledHabitsCount > 0 && completedHabitsCount === scheduledHabitsCount;

  async function handleAction(
    action: (fd: FormData) => Promise<void>,
    fd: FormData,
  ) {
    setPending(true);
    setStatusMsg("");
    try {
      await action(fd);
      setStatusMsg(lang === "id" ? "Tersimpan ✓" : "Saved ✓");
    } catch {
      setStatusMsg(
        lang === "id"
          ? "Gagal menyimpan. Coba lagi."
          : "Could not save. Try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/70 via-card to-card shadow-sm dark:border-violet-900/30">
      <CardContent className="space-y-3.5 p-4 sm:p-5">
        {/* Top Header Strip */}
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t("Aksi & Fokus Hari Ini", "Today's Action & Focus")}
              </h2>
              <p className="text-[11px] text-muted-foreground">
                {allHabitsDone
                  ? t("Semua kebiasaan tuntas!", "All habits complete today!")
                  : t("Selesaikan target kecilmu.", "Complete your daily targets.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-xl border bg-background/80 px-2.5 py-1 text-violet-700 dark:text-violet-300">
              {completedHabitsCount}/{scheduledHabitsCount} {t("kebiasaan", "habits")}
            </span>
          </div>
        </div>

        {/* Uncompleted Habits Quick Check-in Chips */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Check-in Kebiasaan", "Habit Check-in")}
          </span>

          {uncompletedHabits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {uncompletedHabits.map((h) => (
                <form
                  key={h.id}
                  action={(fd) => handleAction(checkHabit, fd)}
                >
                  <input type="hidden" name="habitId" value={h.id} />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending}
                    className="h-8 gap-1.5 rounded-xl bg-violet-600 text-xs font-medium text-white shadow-sm transition hover:bg-violet-700"
                  >
                    <Check className="size-3.5" />
                    <span>{h.name}</span>
                  </Button>
                </form>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>{t("Semua kebiasaan hari ini sudah dicentang.", "All scheduled habits for today are done.")}</span>
            </div>
          )}
        </div>

        {/* Compact Goal Progress Update */}
        {goals.length > 0 && (
          <div className="space-y-1.5 border-t pt-2.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Progres Tujuan Cepat", "Quick Goal Progress")}
            </span>

            <form
              action={(fd) => handleAction(updateGoal, fd)}
              className="flex flex-wrap items-center gap-2"
            >
              <select
                name="goalId"
                required
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="h-8 min-w-[140px] flex-1 rounded-xl border bg-background px-2.5 text-xs font-medium"
              >
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>

              {selectedGoal?.nextStep ? (
                <>
                  <input
                    type="hidden"
                    name="stepId"
                    value={selectedGoal.nextStep.id}
                  />
                  <span
                    className="h-8 max-w-[180px] truncate rounded-xl border bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground"
                    title={selectedGoal.nextStep.title}
                  >
                    {selectedGoal.nextStep.title}
                  </span>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending}
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-semibold"
                  >
                    {t("Selesaikan Langkah", "Done Step")}
                  </Button>
                </>
              ) : (
                <>
                  <input
                    name="progress"
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={selectedGoal?.progress ?? 0}
                    key={selectedGoalId}
                    className="h-8 w-16 rounded-xl border bg-background px-2 text-center text-xs font-medium"
                    aria-label="Progress %"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={pending}
                    variant="outline"
                    className="h-8 rounded-xl text-xs font-semibold"
                  >
                    {t("Simpan %", "Save %")}
                  </Button>
                </>
              )}
            </form>
          </div>
        )}

        {statusMsg && (
          <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            {statusMsg}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
