import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPersonalGoal,
  listPersonalGoals,
  updatePersonalGoal,
} from "@/lib/actions/personal-goals";
import { listPersonalHabits } from "@/lib/actions/personal-habits";
import {
  calculateGoalMetrics,
  calculateHabitHeatmap,
  calculateWeeklyConsistency,
} from "@/lib/personal-productivity/visuals";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HabitsSection } from "@/components/productivity/habits-section";
import { ProductivityKpiCards } from "@/components/productivity/productivity-kpi-cards";
import { GoalProgressCard } from "@/components/productivity/goal-progress-card";
import { HabitHeatmap } from "@/components/productivity/habit-heatmap";
import { GoalDialog } from "@/components/productivity/goal-dialog";
import { Target, ArrowRight } from "lucide-react";

export default async function ProductivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const { tab = "overview" } = await searchParams;

  const goals = await listPersonalGoals();
  const habits = await listPersonalHabits();
  const today = habits[0]?.today ?? new Date().toISOString().slice(0, 10);

  // Aggregated Visual Metrics
  const goalMetrics = calculateGoalMetrics(goals);
  const activeHabits = habits.filter((h) => h.status === "active");
  const habitsCompletedToday = activeHabits.filter((h) =>
    h.checkins.some((c) => c.localDate === today),
  ).length;

  const bestStreak = habits.reduce((max, h) => {
    const done = new Set(h.checkins.map((c) => c.localDate));
    return Math.max(max, done.size > 0 ? 1 : 0);
  }, 0);

  const heatmapCells = calculateHabitHeatmap(habits, today, 35);
  const weeklyTrends = calculateWeeklyConsistency(habits, today, 5);

  async function createGoal(formData: FormData) {
    "use server";
    await createPersonalGoal({
      title: String(formData.get("title") || ""),
      description: String(formData.get("description") || "") || null,
      lifeArea: String(formData.get("lifeArea") || "Other"),
      deadline: String(formData.get("deadline") || "") || null,
      priority: String(formData.get("priority") || "medium") as
        "low" | "medium" | "high",
      manualProgress: Number(formData.get("manualProgress") || 0),
    });
    redirect("/app/productivity?tab=goals");
  }

  async function setStatus(formData: FormData) {
    "use server";
    const id = String(formData.get("id"));
    const goal = goals.find((x) => x.id === id);
    if (!goal) return;
    await updatePersonalGoal(id, {
      title: goal.title,
      description: goal.description,
      lifeArea: goal.lifeArea,
      deadline: goal.deadline,
      priority: goal.priority as "low" | "medium" | "high",
      reward: goal.reward,
      status: String(formData.get("status")) as
        "not_started" | "in_progress" | "achieved" | "deferred" | "cancelled",
      manualProgress: goal.manualProgress,
    });
  }

  const activeGoals = goals.filter(
    (x) => x.status === "not_started" || x.status === "in_progress",
  );

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {t("Produktivitas Pribadi", "Personal Productivity")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(
              "Pantau progres tujuan hidup dan konsistensi kebiasaan harian.",
              "Track life goals progress and daily habits consistency.",
            )}
          </p>
        </div>

        {/* Global Action Header */}
        <div className="flex items-center gap-2">
          {tab === "goals" && (
            <GoalDialog lang={lang} createGoalAction={createGoal} />
          )}
        </div>
      </div>

      {/* KPI Top Cards Banner */}
      <ProductivityKpiCards
        activeGoals={goalMetrics.active}
        avgGoalProgress={goalMetrics.avgActiveProgress}
        habitsCompletedToday={habitsCompletedToday}
        habitsScheduledToday={activeHabits.length}
        bestStreak={bestStreak}
        t={t}
      />

      {/* Navigation Tabs Track */}
      <nav
        className="flex gap-2 overflow-x-auto border-b pb-3"
        aria-label={t("Navigasi produktivitas", "Productivity navigation")}
      >
        {[
          ["overview", t("Ringkasan & Visual", "Overview & Visuals")],
          ["goals", t("Tujuan Hidup", "Life Goals")],
          ["habits", t("Kebiasaan", "Daily Habits")],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            className="rounded-xl font-medium"
            asChild
          >
            <Link href={`/app/productivity?tab=${key}`}>{label}</Link>
          </Button>
        ))}
      </nav>

      {/* TAB 1: OVERVIEW & CHARTS */}
      {tab === "overview" && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Priority Goals Progress Visual List */}
          <Card className="rounded-3xl border bg-card shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-semibold">
                  {t("Progres Tujuan Prioritas", "Priority Goals Progress")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {t("Tujuan aktif teratas", "Top active goals")}
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href="/app/productivity?tab=goals"
                  className="text-xs font-semibold text-violet-600 hover:text-violet-700"
                >
                  {t("Lihat Semua", "View All")}
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeGoals.length ? (
                activeGoals.slice(0, 4).map((g) => (
                  <GoalProgressCard
                    key={g.id}
                    goal={g}
                    today={today}
                    setStatusAction={setStatus}
                    t={t}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-8 text-center">
                  <Target className="mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm font-medium">
                    {t("Belum ada tujuan aktif.", "No active goals yet.")}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Habit Consistency Heatmap & Trends */}
          <div className="space-y-6">
            <HabitHeatmap
              cells={heatmapCells}
              weeklyTrends={weeklyTrends}
              t={t}
            />
          </div>
        </div>
      )}

      {/* TAB 2: GOALS LIST */}
      {tab === "goals" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              {goals.length} {t("tujuan terdaftar", "registered goals")}
            </p>
          </div>

          <div className="grid gap-4">
            {goals.length ? (
              goals.map((g) => (
                <GoalProgressCard
                  key={g.id}
                  goal={g}
                  today={today}
                  setStatusAction={setStatus}
                  t={t}
                />
              ))
            ) : (
              <Card className="rounded-3xl border border-dashed p-10 text-center">
                <Target className="mx-auto size-10 text-muted-foreground/50" />
                <h3 className="mt-3 font-bold text-foreground">
                  {t("Belum Ada Tujuan", "No Goals Created")}
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  {t(
                    "Buat tujuan hidup atau keuangan pertama Anda untuk mulai memantau progres visual.",
                    "Create your first life or financial goal to start tracking visual progress.",
                  )}
                </p>
                <div className="mt-4">
                  <GoalDialog lang={lang} createGoalAction={createGoal} />
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: HABITS SECTION */}
      {tab === "habits" && (
        <HabitsSection
          t={t}
          lang={lang}
          goals={goals.map((g) => ({ id: g.id, title: g.title }))}
        />
      )}
    </div>
  );
}
