import {
  createPersonalHabit,
  listPersonalHabits,
  updatePersonalHabit,
} from "@/lib/actions/personal-habits";
import { isHabitScheduled } from "@/lib/personal-productivity/habits";
import { calculateHealthyStreak } from "@/lib/personal-productivity/retention";
import { StreakRecoveryCard } from "@/components/productivity/weekly-review-card";
import { Button } from "@/components/ui/button";
import { HabitDialog } from "@/components/productivity/habit-dialog";
import { HabitWeeklyGrid } from "@/components/productivity/habit-weekly-grid";
import { Flame, Activity } from "lucide-react";

export async function HabitsSection({
  t,
  lang = "id",
  goals = [],
}: {
  t: (id: string, en: string) => string;
  lang?: string;
  goals?: { id: string; title: string }[];
}) {
  const habits = await listPersonalHabits();
  const today = habits[0]?.today ?? new Date().toISOString().slice(0, 10);

  async function create(fd: FormData) {
    "use server";
    const weekdays = fd.getAll("weekdays").map(Number);
    await createPersonalHabit({
      name: String(fd.get("name")),
      description: null,
      goalId: String(fd.get("goalId") || "") || null,
      color: String(fd.get("color") || "") || null,
      icon: String(fd.get("icon") || "") || null,
      frequency: String(fd.get("frequency")) as "daily" | "specific_weekdays",
      weekdays,
      startDate: String(fd.get("startDate")),
      status: "active",
    });
  }

  async function archive(fd: FormData) {
    "use server";
    const h = habits.find((x) => x.id === String(fd.get("habitId")));
    if (!h) return;
    await updatePersonalHabit(h.id, {
      name: h.name,
      description: h.description,
      goalId: h.goalId,
      color: h.color,
      icon: h.icon,
      frequency: h.frequency as "daily" | "specific_weekdays",
      weekdays: h.weekdays,
      startDate: h.startDate,
      status: h.status === "active" ? "archived" : "active",
    });
  }

  const activeHabits = habits.filter((h) => h.status === "active");
  const archivedHabits = habits.filter((h) => h.status === "archived");
  const hasRecovery = activeHabits.some(
    (h) =>
      calculateHealthyStreak(
        h.frequency as "daily" | "specific_weekdays",
        h.weekdays,
        today,
        h.checkins.map((c) => c.localDate),
      ).inRecovery,
  );

  return (
    <div className="space-y-4">
      {/* Top Header Bar for Habits Tab */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          <span>
            {activeHabits.length}{" "}
            {activeHabits.length === 1
              ? t("kebiasaan aktif", "active habit")
              : t("kebiasaan aktif", "active habits")}
          </span>
        </div>
        <HabitDialog
          lang={lang}
          goals={goals}
          today={today}
          createHabitAction={create}
        />
      </div>

      {hasRecovery && <StreakRecoveryCard t={t} />}

      {/* Daily Return Loop: Still to do today banner */}
      {activeHabits.some((h) => {
        const scheduledToday =
          today >= h.startDate &&
          isHabitScheduled(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            today,
          );
        const done = h.checkins.some((c) => c.localDate === today);
        return scheduledToday && !done;
      }) && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-violet-200 bg-violet-50/70 p-3 text-xs text-violet-900 shadow-none dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200">
          <div className="flex items-center gap-2">
            <Activity className="size-3.5 shrink-0 text-violet-600" />
            <span className="font-semibold">
              {t("Masih ada yang belum selesai:", "Still to do today:")}
            </span>
            <span className="truncate font-medium">
              {activeHabits
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
                .map((h) => h.name)
                .join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Active Habits Interactive Week Grid */}
      {activeHabits.length > 0 ? (
        <HabitWeeklyGrid
          habits={activeHabits}
          today={today}
          lang={lang}
        />
      ) : (
        <div className="rounded-xl border border-dashed p-8 text-center">
          <Flame className="mx-auto size-8 text-muted-foreground/50" />
          <h3 className="mt-2 text-sm font-bold text-foreground">
            {t("Belum Ada Kebiasaan", "No Habits Created")}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {t(
              "Tambahkan kebiasaan harian pertama untuk mulai membangun konsistensi.",
              "Add your first daily habit to start building consistency.",
            )}
          </p>
        </div>
      )}

      {/* Archived Section */}
      {archivedHabits.length > 0 && (
        <details className="space-y-2 rounded-xl border bg-card p-3">
          <summary className="cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground">
            {t("Kebiasaan Diarsipkan", "Archived Habits")} (
            {archivedHabits.length})
          </summary>
          <div className="grid gap-1.5 pt-1.5">
            {archivedHabits.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border bg-muted/20 p-2 text-xs"
              >
                <span className="font-medium text-muted-foreground line-through">
                  {h.name}
                </span>
                <form action={archive}>
                  <input type="hidden" name="habitId" value={h.id} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 rounded text-[11px]"
                  >
                    {t("Pulihkan", "Restore")}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
