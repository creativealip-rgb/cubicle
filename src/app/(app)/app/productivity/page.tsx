import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPersonalGoal,
  listPersonalGoals,
  togglePersonalGoalStep,
  updatePersonalGoal,
} from "@/lib/actions/personal-goals";
import { listPersonalHabits, togglePersonalHabitCheckin } from "@/lib/actions/personal-habits";
import {
  calculateGoalMetrics,
  calculateHabitHeatmap,
  calculateWeeklyConsistency,
} from "@/lib/personal-productivity/visuals";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { HabitsSection } from "@/components/productivity/habits-section";
import { ProductivityKpiCards } from "@/components/productivity/productivity-kpi-cards";
import { GoalProgressCard } from "@/components/productivity/goal-progress-card";
import { HabitHeatmap } from "@/components/productivity/habit-heatmap";
import { GoalDialog } from "@/components/productivity/goal-dialog";
import { UnifiedTodayActionCard } from "@/components/productivity/unified-today-action-card";
import { WeeklyReviewCard } from "@/components/productivity/weekly-review-card";
import { GoalStarterLinks } from "@/components/productivity/today-focus-card";
import { Target, ArrowRight } from "lucide-react";
import { healthyHabitStats, weeklyReview } from "@/lib/personal-productivity/retention";
import { dateOffset, isHabitScheduled } from "@/lib/personal-productivity/habits";
import { calculateGoalProgress } from "@/lib/personal-productivity/goals";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";

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
  const scheduledHabitsToday = activeHabits.filter(
    (h) =>
      today >= h.startDate &&
      isHabitScheduled(
        h.frequency as "daily" | "specific_weekdays",
        h.weekdays,
        today,
      ),
  );
  const habitsCompletedToday = scheduledHabitsToday.filter((h) =>
    h.checkins.some((c) => c.localDate === today),
  ).length;

  const habitRetentionStats = activeHabits.map((h) => healthyHabitStats(h.frequency as "daily" | "specific_weekdays", h.weekdays, today, h.checkins.map((c) => c.localDate)));
  const bestStreak = habitRetentionStats.reduce((max, stats) => Math.max(max, stats.bestStreak), 0);
  const completedDays = new Set(activeHabits.flatMap((h) => h.checkins.map((c) => c.localDate))).size;

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

  async function quickCheckHabit(formData: FormData) {
    "use server";
    await togglePersonalHabitCheckin(String(formData.get("habitId")));
  }

  async function quickUpdateGoal(formData: FormData) {
    "use server";
    const id = String(formData.get("goalId"));
    const goal = goals.find((item) => item.id === id);
    if (!goal) throw new Error("Goal not found");
    const stepId = String(formData.get("stepId") || "");
    if (stepId) {
      const step = goal.steps.find((item) => item.id === stepId && !item.isCompleted);
      if (!step) throw new Error("Step not found");
      await togglePersonalGoalStep(step.id, true);
      return;
    }
    await updatePersonalGoal(id, {
      title: goal.title,
      description: goal.description,
      lifeArea: goal.lifeArea,
      deadline: goal.deadline,
      priority: goal.priority as "low" | "medium" | "high",
      reward: goal.reward,
      status: goal.status as "not_started" | "in_progress" | "achieved" | "deferred" | "cancelled",
      manualProgress: Number(formData.get("progress")),
    });
  }

  const activeGoals = goals.filter(
    (x) => x.status === "not_started" || x.status === "in_progress",
  );
  const attentionHabit = activeHabits.map((h) => ({ h, rate: calculateWeeklyConsistency([h], today, 1)[0]?.rate ?? 0 })).sort((a, b) => a.rate - b.rate)[0]?.h.name ?? null;
  const staleThreshold = new Date(`${dateOffset(today, -7)}T00:00:00Z`);
  const staleGoal = activeGoals.find((g) => g.progressUpdatedAt <= staleThreshold)?.title ?? null;
  const stagnantGoals = activeGoals.filter((g) => g.progressUpdatedAt <= staleThreshold).length;
  const movingGoals = activeGoals.filter((g) => g.progressUpdatedAt > staleThreshold).length;
  const focusGoal = staleGoal ?? activeGoals.find((g) => calculateGoalProgress(g.steps.map((step) => step.isCompleted), g.manualProgress) < 100)?.title ?? null;
  const review = weeklyReview(weeklyTrends[4]?.completed ?? 0, weeklyTrends[4]?.totalScheduled ?? 0, goalMetrics.active, movingGoals);

  return (
    <div className="space-y-4">
      {/* Header with Title */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {t("Produktivitas Pribadi", "Personal Productivity")}
          </h1>
          <p className="text-xs text-muted-foreground">
            {t(
              "Pantau progres tujuan hidup dan konsistensi kebiasaan harian.",
              "Track life goals progress and daily habits consistency.",
            )}
          </p>
        </div>
      </div>

      {/* KPI Top Cards Banner - Compact 4 Strip */}
      <ProductivityKpiCards
        activeGoals={goalMetrics.active}
        avgGoalProgress={goalMetrics.avgActiveProgress}
        habitsCompletedToday={habitsCompletedToday}
        habitsScheduledToday={scheduledHabitsToday.length}
        bestStreak={bestStreak}
        completedDays={completedDays}
        t={t}
      />

      {/* Main Single Card Container with Integrated Tab Header */}
      <Card className="rounded-xl border shadow-none bg-card">
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <StatusFilterTabs
              activeValue={tab}
              hideEmpty={false}
              tabs={[
                { value: "overview", label: t("Ringkasan & Visual", "Overview & Visuals"), href: "/app/productivity?tab=overview", alwaysShow: true },
                { value: "goals", label: t("Tujuan Hidup", "Life Goals"), count: goals.length, href: "/app/productivity?tab=goals", alwaysShow: true },
                { value: "habits", label: t("Kebiasaan", "Daily Habits"), count: activeHabits.length, href: "/app/productivity?tab=habits", alwaysShow: true },
              ]}
            />

            {tab === "goals" && (
              <div className="shrink-0">
                <GoalDialog lang={lang} createGoalAction={createGoal} />
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {/* TAB 1: OVERVIEW & CHARTS */}
          {tab === "overview" && (
            <div className="space-y-4">
              {/* Action Row: Unified Today Action & Weekly Rhythm */}
              <div className="grid gap-3 lg:grid-cols-2">
                <UnifiedTodayActionCard
                  scheduledHabitsCount={activeHabits.length}
                  completedHabitsCount={habitsCompletedToday}
                  uncompletedHabits={activeHabits
                    .filter(
                      (h) =>
                        today >= h.startDate &&
                        isHabitScheduled(
                          h.frequency as "daily" | "specific_weekdays",
                          h.weekdays,
                          today,
                        ) &&
                        !h.checkins.some((c) => c.localDate === today),
                    )
                    .map((h) => ({ id: h.id, name: h.name }))}
                  activeGoalsCount={goalMetrics.active}
                  goals={activeGoals.map((g) => ({
                    id: g.id,
                    title: g.title,
                    progress: g.manualProgress,
                    nextStep: g.steps.find((step) => !step.isCompleted)
                      ? {
                          id: g.steps.find((step) => !step.isCompleted)!.id,
                          title: g.steps.find((step) => !step.isCompleted)!.title,
                        }
                      : null,
                  }))}
                  checkHabit={quickCheckHabit}
                  updateGoal={quickUpdateGoal}
                  lang={lang as "id" | "en"}
                />

                <WeeklyReviewCard
                  {...review}
                  attentionHabit={attentionHabit}
                  focusGoal={focusGoal}
                  stagnantGoals={stagnantGoals}
                  t={t}
                />
              </div>

              {/* Progress Row: Priority Goals (Left) & Habit Heatmap (Right) */}
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Priority Goals Progress Visual List */}
                <div className="rounded-lg border bg-slate-50/40 dark:bg-card p-3.5 space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div>
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                        {t("Progres Tujuan Prioritas", "Priority Goals Progress")}
                      </h3>
                      <p className="text-[11px] text-muted-foreground">
                        {t("Tujuan aktif teratas", "Top active goals")}
                      </p>
                    </div>
                    <Link
                      href="/app/productivity?tab=goals"
                      className="text-xs font-semibold text-violet-600 hover:text-violet-700 flex items-center"
                    >
                      {t("Lihat Semua", "View All")}
                      <ArrowRight className="ml-1 size-3" />
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {activeGoals.length ? (
                      activeGoals.slice(0, 4).map((g) => (
                        <GoalProgressCard
                          key={g.id}
                          goal={g}
                          today={today}
                          setStatusAction={setStatus}
                          compact
                          t={t}
                        />
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                        <Target className="mb-1.5 size-6 text-muted-foreground/50" />
                        <p className="text-xs font-medium">
                          {t("Belum ada tujuan aktif.", "No active goals yet.")}
                        </p>
                        <div className="mt-2">
                          <GoalStarterLinks t={t} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Habit Consistency Heatmap & Trends */}
                <div className="space-y-3">
                  <HabitHeatmap
                    cells={heatmapCells}
                    weeklyTrends={weeklyTrends}
                    t={t}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOALS LIST */}
          {tab === "goals" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>
                  {goals.length} {goals.length === 1 ? t("tujuan terdaftar", "registered goal") : t("tujuan terdaftar", "registered goals")}
                </span>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
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
                  <div className="sm:col-span-2 rounded-xl border border-dashed p-8 text-center">
                    <Target className="mx-auto size-8 text-muted-foreground/50" />
                    <h3 className="mt-2 text-sm font-bold text-foreground">
                      {t("Belum Ada Tujuan", "No Goals Created")}
                    </h3>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                      {t(
                        "Buat tujuan hidup atau keuangan pertama Anda untuk mulai memantau progres visual.",
                        "Create your first life or financial goal to start tracking visual progress.",
                      )}
                    </p>
                    <div className="mt-3">
                      <GoalDialog lang={lang} createGoalAction={createGoal} />
                    </div>
                  </div>
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
        </CardContent>
      </Card>
    </div>
  );
}
