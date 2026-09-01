import {
  createPersonalHabit,
  listPersonalHabits,
  togglePersonalHabitCheckin,
  updatePersonalHabit,
} from "@/lib/actions/personal-habits";
import { dateOffset, habitStats } from "@/lib/personal-productivity/habits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export async function HabitsSection({
  t,
  goals = [],
}: {
  t: (id: string, en: string) => string;
  goals?: { id: string; title: string }[];
}) {
  const habits = await listPersonalHabits();
  const today = habits[0]?.today ?? "1970-01-01",
    from = dateOffset(today, -29);
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
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("Tambah kebiasaan", "Add habit")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={create} className="space-y-3">
            <Input
              name="name"
              required
              placeholder={t("Nama kebiasaan", "Habit name")}
            />
            <Input name="startDate" type="date" required defaultValue={today} />
            <select
              name="goalId"
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="">{t("Tanpa tujuan", "No goal")}</option>
              {goals.map((goal) => (
                <option key={goal.id} value={goal.id}>
                  {goal.title}
                </option>
              ))}
            </select>
            <Input
              name="color"
              type="color"
              defaultValue="#6366f1"
              aria-label={t("Warna", "Color")}
            />
            <select
              name="frequency"
              className="h-10 w-full rounded-md border bg-background px-3"
            >
              <option value="daily">{t("Setiap hari", "Daily")}</option>
              <option value="specific_weekdays">
                {t("Hari tertentu", "Specific weekdays")}
              </option>
            </select>
            <fieldset>
              <legend className="text-sm">{t("Hari", "Weekdays")}</legend>
              <div className="flex flex-wrap gap-2">
                {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(
                  (d, i) => (
                    <label key={d} className="rounded border px-2 py-1 text-sm">
                      <input
                        className="mr-1"
                        type="checkbox"
                        name="weekdays"
                        value={i}
                      />
                      {d}
                    </label>
                  ),
                )}
              </div>
            </fieldset>
            <Button className="w-full">
              {t("Tambah kebiasaan", "Add habit")}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-3">
        {habits.map((h) => {
          const done = h.checkins.some((c) => c.localDate === today),
            stats = habitStats(
              h.frequency as "daily" | "specific_weekdays",
              h.weekdays,
              from,
              today,
              h.checkins.map((c) => c.localDate),
            );
          return (
            <Card
              key={h.id}
              className={h.status === "archived" ? "opacity-60" : ""}
            >
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{h.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {t("Beruntun", "Streak")}: {stats.currentStreak} ·{" "}
                      {stats.completionRate}%
                    </p>
                  </div>
                  {h.status === "active" && (
                    <form action={toggle}>
                      <input type="hidden" name="habitId" value={h.id} />
                      <Button variant={done ? "default" : "outline"}>
                        {done ? "✓ " : "○ "}
                        {t("Hari ini", "Today")}
                      </Button>
                    </form>
                  )}
                </div>
                <form action={archive}>
                  <input type="hidden" name="habitId" value={h.id} />
                  <Button size="sm" variant="ghost">
                    {h.status === "active"
                      ? t("Arsipkan", "Archive")
                      : t("Aktifkan", "Restore")}
                  </Button>
                </form>
              </CardContent>
            </Card>
          );
        })}
        {!habits.length && (
          <Card>
            <CardContent className="pt-6">
              {t("Belum ada kebiasaan.", "No habits yet.")}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
