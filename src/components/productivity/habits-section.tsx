import {
  createPersonalHabit,
  deletePersonalHabit,
  listPersonalHabits,
  togglePersonalHabitCheckin,
  updatePersonalHabit,
} from "@/lib/actions/personal-habits";
import { dateOffset, habitStats, isHabitScheduled } from "@/lib/personal-productivity/habits";
import { calculateHealthyStreak } from "@/lib/personal-productivity/retention";
import { StreakRecoveryCard } from "@/components/productivity/weekly-review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HabitDialog } from "@/components/productivity/habit-dialog";
import { HabitHeatmap } from "@/components/productivity/habit-heatmap";
import { Flame, CheckCircle, Check, Archive, RotateCcw } from "lucide-react";

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
  const from = dateOffset(today, -29);

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

  async function toggle(fd: FormData) {
    "use server";
    await togglePersonalHabitCheckin(String(fd.get("habitId")));
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

  async function updateHabitAction(fd: FormData) {
    "use server";
    const h = habits.find((item) => item.id === String(fd.get("habitId")));
    if (!h) throw new Error("Habit not found");
    await updatePersonalHabit(h.id, {
      name: String(fd.get("name") || h.name),
      description: h.description,
      goalId: h.goalId,
      color: h.color,
      icon: h.icon,
      frequency: h.frequency as "daily" | "specific_weekdays",
      weekdays: h.weekdays,
      startDate: h.startDate,
      status: h.status as "active" | "archived",
    });
  }

  async function deleteHabitAction(fd: FormData) {
    "use server";
    await deletePersonalHabit(String(fd.get("habitId")));
  }

  const activeHabits = habits.filter((h) => h.status === "active");
  const archivedHabits = habits.filter((h) => h.status === "archived");
  const hasRecovery = activeHabits.some((h) => calculateHealthyStreak(h.frequency as "daily" | "specific_weekdays", h.weekdays, today, h.checkins.map((c) => c.localDate)).inRecovery);

  return (
    <div className="space-y-6">
      {/* Top Header Bar for Habits Tab */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">
            {t("Daftar Kebiasaan", "Habits Tracker")}
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeHabits.length} {activeHabits.length === 1 ? t("kebiasaan aktif", "active habit tracked") : t("kebiasaan aktif", "active habits tracked")}
          </p>
        </div>
        <HabitDialog
          lang={lang}
          goals={goals}
          today={today}
          createHabitAction={create}
        />
      </div>

      {hasRecovery && <StreakRecoveryCard t={t} />}

      {/* Active Habits List */}

      <div className="grid gap-4">
        {activeHabits.map((h) => {
          const scheduledToday = today >= h.startDate && isHabitScheduled(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            today,
          );
          const done = h.checkins.some((c) => c.localDate === today);
          const stats = habitStats(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            from,
            today,
            h.checkins.map((c) => c.localDate),
          );
          const healthyStreak = calculateHealthyStreak(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            today,
            h.checkins.map((c) => c.localDate),
          );

          // 14-day history dots
          const recentDays = Array.from({ length: 14 }).map((_, idx) => {
            const d = dateOffset(today, -13 + idx);
            const isChecked = h.checkins.some((c) => c.localDate === d);
            const scheduled = d >= h.startDate && isHabitScheduled(h.frequency as "daily" | "specific_weekdays", h.weekdays, d);
            return { date: d, isChecked, scheduled };
          });

          return (
            <Card
              key={h.id}
              className="overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:shadow-md"
            >
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ backgroundColor: h.color || "#6366f1" }}
                      />
                      <h3 className="text-base font-bold tracking-tight text-foreground">
                        {h.name}
                      </h3>
                      {h.frequency === "daily" ? (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                          {t("Setiap Hari", "Daily")}
                        </span>
                      ) : (
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase">
                          {t("Hari Tertentu", "Custom Days")}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Flame className="size-3.5" />
                        <span>
                          {healthyStreak.streak} {t("hari beruntun", "day streak")}
                        </span>
                      </div>
                      <span>•</span>
                      <span>
                        {stats.completionRate}% {t("dalam 30 hari", "30-day rate")}
                      </span>
                      {healthyStreak.inRecovery && <><span>•</span><span className="font-semibold text-amber-600 dark:text-amber-400">{t("Mode pemulihan", "Recovery mode")}</span></>}
                    </div>
                    {scheduledToday && !done && <p className="text-xs font-medium text-amber-700 dark:text-amber-300">{t("Masih perlu diselesaikan hari ini", "Still to do today")}</p>}
                  </div>

                  {/* Right Actions: Today Check-in & Archive */}
                  <div className="flex items-center gap-2">
                    <form action={toggle}>
                      <input type="hidden" name="habitId" value={h.id} />
                      <Button
                        type="submit"
                        disabled={!scheduledToday}
                        variant="default"
                        className={`min-h-11 rounded-2xl px-4 font-semibold transition ${
                          done
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-violet-600 text-white hover:bg-violet-700"
                        }`}
                      >
                        {done ? (
                          <>
                            <Check className="mr-1.5 size-4" />
                            {t("Selesai Hari Ini", "Done Today")}
                          </>
                        ) : scheduledToday ? (
                          <>
                            <span className="mr-1.5 inline-block size-3 rounded-full border-2 border-current" />
                            {t("Tandai Hari Ini", "Check Today")}
                          </>
                        ) : (
                          t("Tidak dijadwalkan hari ini", "Not scheduled today")
                        )}
                      </Button>
                    </form>

                    <form action={archive}>
                      <input type="hidden" name="habitId" value={h.id} />
                      <Button
                        size="sm"
                        variant="ghost"
                        className="min-h-11 min-w-11 rounded-xl border border-transparent px-3 text-muted-foreground hover:border-border hover:text-foreground"
                        title={t("Arsipkan kebiasaan", "Archive habit")}
                      >
                        <Archive className="size-4" />
                      </Button>
                    </form>
                  </div>
                </div>

                <details className="border-t pt-3">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium text-muted-foreground">
                    {t("Kelola kebiasaan", "Manage habit")}
                  </summary>
                  <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <form action={updateHabitAction} className="flex gap-2">
                    <input type="hidden" name="habitId" value={h.id} />
                    <input name="name" defaultValue={h.name} required aria-label={t("Ubah nama kebiasaan", "Edit habit name")} className="min-h-11 min-w-0 flex-1 rounded-xl border bg-background px-3 text-sm" />
                    <Button variant="outline" className="min-h-11">{t("Simpan", "Save")}</Button>
                  </form>
                  <form action={deleteHabitAction}>
                    <input type="hidden" name="habitId" value={h.id} />
                    <Button variant="destructive" className="min-h-11">{t("Hapus", "Delete")}</Button>
                  </form>
                  </div>
                </details>

                <HabitHeatmap
                  cells={recentDays.map((day) => ({
                    date: day.date,
                    dayOfWeek: new Date(`${day.date}T12:00:00Z`).getUTCDay(),
                    completedCount: day.isChecked ? 1 : 0,
                    totalScheduled: day.scheduled ? 1 : 0,
                    intensity: day.isChecked ? 4 : 0,
                  }))}
                  weeklyTrends={[]}
                  t={t}
                />


              </CardContent>
            </Card>
          );
        })}

        {!activeHabits.length && (
          <Card className="rounded-3xl border border-dashed p-10 text-center">
            <CheckCircle className="mx-auto size-10 text-muted-foreground/50" />
            <h3 className="mt-3 font-bold text-foreground">
              {t("Belum Ada Kebiasaan", "No Habits Tracked")}
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              {t(
                "Mulai bangun kebiasaan positif harian dengan menambahkan aktivitas pertama.",
                "Start building daily positive habits by adding your first routine.",
              )}
            </p>
            <div className="mt-4">
              <HabitDialog
                lang={lang}
                goals={goals}
                today={today}
                createHabitAction={create}
              />
            </div>
          </Card>
        )}
      </div>

      {/* Archived Habits Section */}
      {archivedHabits.length > 0 && (
        <div className="border-t pt-6 space-y-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Kebiasaan Diarsipkan", "Archived Habits")}
          </h3>
          <div className="grid gap-2">
            {archivedHabits.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-2xl border bg-muted/20 px-4 py-2.5 text-sm"
              >
                <span className="line-through text-muted-foreground">{h.name}</span>
                <form action={archive}>
                  <input type="hidden" name="habitId" value={h.id} />
                  <Button size="sm" variant="ghost" className="min-h-11 gap-1 text-xs">
                    <RotateCcw className="size-3.5" />
                    {t("Aktifkan Kembali", "Restore")}
                  </Button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}