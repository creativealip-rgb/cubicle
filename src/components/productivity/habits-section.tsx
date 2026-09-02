import {
  createPersonalHabit,
  deletePersonalHabit,
  listPersonalHabits,
  togglePersonalHabitCheckin,
  updatePersonalHabit,
} from "@/lib/actions/personal-habits";
import { habitStats, isHabitScheduled } from "@/lib/personal-productivity/habits";
import { calculateHealthyStreak } from "@/lib/personal-productivity/retention";
import { StreakRecoveryCard } from "@/components/productivity/weekly-review-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HabitDialog } from "@/components/productivity/habit-dialog";
import { HabitHeatmap } from "@/components/productivity/habit-heatmap";
import { calculateWeeklyConsistency, calculateHabitHeatmap } from "@/lib/personal-productivity/visuals";
import { Flame, CheckCircle2, Check, Archive, ChevronDown, Activity } from "lucide-react";
import { Input } from "@/components/ui/input";

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

      {/* Daily Return Loop: Still to do today banner */}
      {activeHabits.some((h) => {
        const scheduledToday = today >= h.startDate && isHabitScheduled(h.frequency as "daily" | "specific_weekdays", h.weekdays, today);
        const done = h.checkins.some((c) => c.localDate === today);
        return scheduledToday && !done;
      }) && (
        <div className="rounded-2xl border border-violet-200 bg-violet-50/70 p-3.5 text-xs text-violet-900 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200 flex items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-violet-600 shrink-0" />
            <span className="font-semibold">{t("Masih ada kebiasaan yang belum selesai hari ini:", "Still to do today:")}</span>
            <span className="font-medium">
              {activeHabits
                .filter((h) => today >= h.startDate && isHabitScheduled(h.frequency as "daily" | "specific_weekdays", h.weekdays, today) && !h.checkins.some((c) => c.localDate === today))
                .map((h) => h.name)
                .join(", ")}
            </span>
          </div>
        </div>
      )}

      {/* Active Habits List */}
      <div className="grid gap-4">
        {activeHabits.map((h) => {
          const scheduledToday = today >= h.startDate && isHabitScheduled(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            today,
          );
          const doneToday = h.checkins.some((c) => c.localDate === today);
          const stats = habitStats(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            h.startDate,
            today,
            h.checkins.map((c) => c.localDate),
          );
          const healthy = calculateHealthyStreak(
            h.frequency as "daily" | "specific_weekdays",
            h.weekdays,
            today,
            h.checkins.map((c) => c.localDate),
          );

          return (
            <Card key={h.id} className="rounded-3xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <CardContent className="space-y-4 p-5">
                {/* Habit Header & Primary Check-in Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground truncate">{h.name}</h3>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {h.frequency === "daily" ? t("Setiap Hari", "Daily") : t("Hari Tertentu", "Custom Days")}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                        <Flame className="size-3.5" />
                        <span>{healthy.streak} {healthy.streak === 1 ? t("hari streak", "day streak") : t("hari streak", "days streak")}</span>
                      </span>
                      <span>•</span>
                      <span>{stats.completionRate}% {t("rate 30 hari", "30-day rate")}</span>
                      {healthy.inRecovery && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-amber-700 dark:text-amber-300">
                            {t("Mode pemulihan", "Recovery mode")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Primary Action Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    {scheduledToday && (
                      <form action={toggle}>
                        <input type="hidden" name="habitId" value={h.id} />
                        <Button
                          type="submit"
                          size="sm"
                          className={`min-h-11 min-w-28 gap-1.5 rounded-xl font-semibold shadow-sm transition active:scale-95 ${
                            doneToday
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "bg-violet-600 text-white hover:bg-violet-700"
                          }`}
                        >
                          {doneToday ? (
                            <>
                              <CheckCircle2 className="size-4" />
                              <span>{t("Selesai Hari Ini", "Done Today")}</span>
                            </>
                          ) : (
                            <>
                              <Check className="size-4" />
                              <span>{t("Check Hari Ini", "Check Today")}</span>
                            </>
                          )}
                        </Button>
                      </form>
                    )}

                    <form action={archive}>
                      <input type="hidden" name="habitId" value={h.id} />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground rounded-xl"
                        title={t("Arsipkan", "Archive habit")}
                      >
                        <Archive className="size-4" />
                      </Button>
                    </form>
                  </div>
                </div>

                {/* Heatmap & Details in Clean Collapsible Accordion */}
                <details className="group text-xs">
                  <summary className="flex items-center justify-between cursor-pointer py-1 text-muted-foreground hover:text-foreground font-semibold list-none">
                    <span className="flex items-center gap-1.5">
                      <Activity className="size-3.5 text-violet-600" />
                      <span>{t("Konsistensi 35 Hari & Pengaturan", "35-Day Consistency & Settings")}</span>
                    </span>
                    <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
                  </summary>

                  <div className="pt-3 space-y-4 border-t mt-2">
                    <HabitHeatmap
                      cells={calculateHabitHeatmap([h], today)}
                      weeklyTrends={calculateWeeklyConsistency([h], today)}
                      t={t}
                    />

                    <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                      <p className="text-xs font-bold text-foreground">{t("Edit Detail Kebiasaan", "Edit Habit Details")}</p>
                      <form action={updateHabitAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="hidden" name="habitId" value={h.id} />
                        <div className="space-y-1 sm:col-span-2">
                          <label className="text-[11px] font-medium text-muted-foreground">{t("Nama Kebiasaan", "Habit Name")}</label>
                          <Input name="name" defaultValue={h.name} required className="h-8 text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">{t("Frekuensi", "Frequency")}</label>
                          <select name="frequency" defaultValue={h.frequency} className="h-8 w-full rounded-md border bg-background px-2 text-xs">
                            <option value="daily">{t("Setiap Hari", "Daily")}</option>
                            <option value="specific_weekdays">{t("Hari Tertentu", "Specific Weekdays")}</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-muted-foreground">{t("Tanggal Mulai", "Start Date")}</label>
                          <Input name="startDate" type="date" defaultValue={h.startDate} required className="h-8 text-xs" />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-1">
                          <Button size="sm" variant="outline" className="h-8 text-xs rounded-xl">{t("Simpan Perubahan", "Save Changes")}</Button>
                          <Button formAction={deleteHabitAction} variant="destructive" size="sm" className="h-8 text-xs rounded-xl bg-red-600 text-white hover:bg-red-700">{t("Hapus", "Delete")}</Button>
                        </div>
                      </form>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          );
        })}

        {activeHabits.length === 0 && (
          <div className="rounded-3xl border bg-card p-8 text-center space-y-2">
            <p className="text-sm font-semibold text-foreground">{t("Belum ada kebiasaan aktif.", "No active habits tracked yet.")}</p>
            <p className="text-xs text-muted-foreground">{t("Mulai dengan menambahkan kebiasaan kecil pertamamu hari ini.", "Start by adding your first small daily habit today.")}</p>
          </div>
        )}
      </div>

      {/* Archived Section */}
      {archivedHabits.length > 0 && (
        <details className="rounded-3xl border bg-card p-4 space-y-3">
          <summary className="cursor-pointer text-xs font-bold text-muted-foreground hover:text-foreground">
            {t("Kebiasaan Diarsipkan", "Archived Habits")} ({archivedHabits.length})
          </summary>
          <div className="grid gap-2 pt-2">
            {archivedHabits.map((h) => (
              <div key={h.id} className="flex items-center justify-between rounded-xl border p-3 bg-muted/20 text-xs">
                <span className="font-medium text-muted-foreground line-through">{h.name}</span>
                <form action={archive}>
                  <input type="hidden" name="habitId" value={h.id} />
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg">
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
