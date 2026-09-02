"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles, Check, Target } from "lucide-react";
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
}: Omit<UnifiedTodayActionCardProps, "t">) {
  const t = (id: string, en: string) => (lang === "id" ? id : en);
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
    <Card className="overflow-hidden rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/60 via-card to-card shadow-sm dark:border-violet-900/30">
      <CardContent className="space-y-4 p-4 sm:p-5">
        {/* Top Header Strip */}
        <div className="flex items-center justify-between gap-2 border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                {t("Aksi & Fokus Hari Ini", "Today's Action & Focus")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {allHabitsDone
                  ? t("Semua kebiasaan tuntas hari ini!", "All habits complete today!")
                  : t("Selesaikan target kecilmu hari ini.", "Complete your daily targets.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-xl border border-violet-200/80 bg-white px-2.5 py-1 text-violet-700 shadow-sm dark:bg-card dark:text-violet-300">
              {completedHabitsCount}/{scheduledHabitsCount} {t("kebiasaan", "habits")}
            </span>
          </div>
        </div>

        {/* Interactive Habit Check-in Chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Check-in Kebiasaan Harian", "Habit Quick Check-in")}
            </span>
            {statusMsg && (
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                {statusMsg}
              </span>
            )}
          </div>

          {uncompletedHabits.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {uncompletedHabits.map((h) => (
                <form
                  key={h.id}
                  action={(fd) => handleAction(checkHabit, fd)}
                >
                  <input type="hidden" name="habitId" value={h.id} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="group inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-violet-400 hover:bg-violet-50/50 hover:text-violet-700 active:scale-95 disabled:opacity-50 dark:bg-card dark:text-slate-200"
                  >
                    <div className="flex size-4 items-center justify-center rounded-full border border-slate-300 transition group-hover:border-violet-500 group-hover:bg-violet-500 group-hover:text-white">
                      <Check className="size-2.5 opacity-0 transition group-hover:opacity-100" />
                    </div>
                    <span>{h.name}</span>
                  </button>
                </form>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/60 px-3.5 py-2 text-xs text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="font-medium">{t("Hebat! Semua kebiasaan hari ini sudah tuntas.", "Great job! All scheduled habits for today are done.")}</span>
            </div>
          )}
        </div>

        {/* Clean Goal Stepper Action */}
        {goals.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Langkah Tujuan Berikutnya", "Next Goal Step")}
            </span>

            <div className="rounded-2xl border bg-white p-3 shadow-sm dark:bg-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <Target className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="w-full truncate bg-transparent text-xs font-bold text-slate-800 outline-none hover:text-violet-600 dark:text-slate-100 cursor-pointer"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title} ({g.progress}%)
                        </option>
                      ))}
                    </select>
                    {selectedGoal?.nextStep ? (
                      <p className="truncate text-[11px] text-muted-foreground mt-0.5">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{t("Langkah:", "Next:")}</span> {selectedGoal.nextStep.title}
                      </p>
                    ) : (
                      <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                        {t("Semua langkah pada tujuan ini selesai!", "All steps for this goal completed!")}
                      </p>
                    )}
                  </div>
                </div>

                {selectedGoal?.nextStep && (
                  <form
                    action={(fd) => handleAction(updateGoal, fd)}
                    className="shrink-0"
                  >
                    <input type="hidden" name="goalId" value={selectedGoal.id} />
                    <input
                      type="hidden"
                      name="stepId"
                      value={selectedGoal.nextStep.id}
                    />
                    <input type="hidden" name="actionType" value="complete_step" />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={pending}
                      className="h-7 gap-1 rounded-lg bg-emerald-600 px-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700"
                    >
                      <Check className="size-3" />
                      <span>{t("Tandai Selesai", "Done Step")}</span>
                    </Button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
