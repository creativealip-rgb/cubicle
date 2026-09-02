"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickCaptureCard({ habits, goals, checkHabit, updateGoal, lang }: {
  habits: { id: string; name: string }[];
  goals: { id: string; title: string; progress: number; nextStep: { id: string; title: string } | null }[];
  checkHabit: (formData: FormData) => Promise<void>;
  updateGoal: (formData: FormData) => Promise<void>;
  lang: "id" | "en";
}) {
  const t = (id: string, en: string) => lang === "id" ? id : en;
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const selectedGoal = goals.find((goal) => goal.id === goalId);
  async function submit(action: (formData: FormData) => Promise<void>, formData: FormData) {
    setPending(true);
    setMessage("");
    try {
      await action(formData);
      setMessage(t("Tersimpan", "Saved"));
    } catch {
      setMessage(t("Gagal menyimpan. Coba lagi.", "Could not save. Try again."));
    } finally {
      setPending(false);
    }
  }
  return <Card className="rounded-3xl border bg-card shadow-sm">
    <CardHeader className="pb-3"><CardTitle className="text-base">{t("Aksi Cepat", "Quick capture")}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <form action={(formData) => submit(checkHabit, formData)} className="flex gap-2">
        <select name="habitId" required className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" defaultValue={habits[0]?.id}>
          {habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
        </select>
        <Button disabled={!habits.length || pending} className="rounded-xl bg-violet-600 text-white">{pending ? t("Menyimpan...", "Saving...") : t("Check-in", "Check in")}</Button>
      </form>
      <form action={(formData) => submit(updateGoal, formData)} className="grid gap-2 sm:grid-cols-[1fr_132px_auto]">
        <select name="goalId" required value={goalId} onChange={(event) => setGoalId(event.target.value)} className="h-10 min-w-0 rounded-xl border bg-background px-3 text-sm">
          {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
        {selectedGoal?.nextStep ? <>
          <input type="hidden" name="stepId" value={selectedGoal.nextStep.id} />
          <div className="flex h-10 min-w-0 items-center truncate rounded-xl border bg-muted/30 px-3 text-xs" title={selectedGoal.nextStep.title}>{t("Langkah berikut", "Next step")}: {selectedGoal.nextStep.title}</div>
        </> : <input name="progress" type="number" min="0" max="100" defaultValue={selectedGoal?.progress ?? 0} key={goalId} className="h-10 rounded-xl border bg-background px-3 text-sm" aria-label={t("Progress tujuan", "Goal progress")} />}
        <Button disabled={!goals.length || pending} variant="outline" className="rounded-xl">{pending ? t("Menyimpan...", "Saving...") : selectedGoal?.nextStep ? t("Tandai selesai", "Mark complete") : t("Update", "Update")}</Button>
      </form>
      {message && <p role="status" className="text-xs text-muted-foreground">{message}</p>}
      {!habits.length && !goals.length && <p className="text-xs text-muted-foreground">{t("Tambahkan kebiasaan atau tujuan untuk mulai.", "Add a habit or goal to get started.")}</p>}
    </CardContent>
  </Card>;
}
