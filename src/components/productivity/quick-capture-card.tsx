"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function QuickCaptureCard({ habits, goals, checkHabit, updateGoal, t }: {
  habits: { id: string; name: string }[];
  goals: { id: string; title: string; progress: number }[];
  checkHabit: (formData: FormData) => Promise<void>;
  updateGoal: (formData: FormData) => Promise<void>;
  t: (id: string, en: string) => string;
}) {
  const [goalId, setGoalId] = useState(goals[0]?.id ?? "");
  const selectedGoal = goals.find((goal) => goal.id === goalId);
  return <Card className="rounded-3xl border bg-card shadow-sm">
    <CardHeader className="pb-3"><CardTitle className="text-base">{t("Aksi Cepat", "Quick capture")}</CardTitle></CardHeader>
    <CardContent className="space-y-4">
      <form action={checkHabit} className="flex gap-2">
        <select name="habitId" required className="h-10 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" defaultValue={habits[0]?.id}>
          {habits.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}
        </select>
        <Button disabled={!habits.length} className="rounded-xl bg-violet-600 text-white">{t("Check-in", "Check in")}</Button>
      </form>
      <form action={updateGoal} className="grid grid-cols-[1fr_84px_auto] gap-2">
        <select name="goalId" required value={goalId} onChange={(event) => setGoalId(event.target.value)} className="h-10 min-w-0 rounded-xl border bg-background px-3 text-sm">
          {goals.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
        </select>
        <input name="progress" type="number" min="0" max="100" defaultValue={selectedGoal?.progress ?? 0} key={goalId} className="h-10 rounded-xl border bg-background px-3 text-sm" aria-label={t("Progress tujuan", "Goal progress")} />
        <Button disabled={!goals.length} variant="outline" className="rounded-xl">{t("Update", "Update")}</Button>
      </form>
      {!habits.length && !goals.length && <p className="text-xs text-muted-foreground">{t("Tambahkan kebiasaan atau tujuan untuk mulai.", "Add a habit or goal to get started.")}</p>}
    </CardContent>
  </Card>;
}
