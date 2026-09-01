import Link from "next/link";
import { redirect } from "next/navigation";
import {
  createPersonalGoal,
  listPersonalGoals,
  updatePersonalGoal,
} from "@/lib/actions/personal-goals";
import { listPersonalHabits } from "@/lib/actions/personal-habits";
import { calculateGoalProgress } from "@/lib/personal-productivity/goals";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HabitsSection } from "@/components/productivity/habits-section";

export default async function ProductivityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const lang = await getCurrentLang(),
    t = createT(lang),
    { tab = "overview" } = await searchParams;
  const goals = await listPersonalGoals();
  const habits = await listPersonalHabits();
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
  const active = goals.filter(
    (x) => x.status === "not_started" || x.status === "in_progress",
  );
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {t("Produktivitas", "Productivity")}
        </h1>
        <p className="text-muted-foreground">
          {t(
            "Tujuan dan kebiasaan pribadi, tetap sama di semua workspace.",
            "Personal goals and habits, available across every workspace.",
          )}
        </p>
      </header>
      <nav
        className="flex gap-2 overflow-x-auto"
        aria-label={t("Navigasi produktivitas", "Productivity navigation")}
      >
        {[
          ["overview", t("Ringkasan", "Overview")],
          ["goals", t("Tujuan", "Goals")],
          ["habits", t("Kebiasaan", "Habits")],
        ].map(([key, label]) => (
          <Button
            key={key}
            variant={tab === key ? "default" : "outline"}
            asChild
          >
            <Link href={`/app/productivity?tab=${key}`}>{label}</Link>
          </Button>
        ))}
      </nav>
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("Tujuan prioritas", "Priority goals")}</CardTitle>
            </CardHeader>
            <CardContent>
              {active.length ? (
                <ul className="space-y-2">
                  {active.slice(0, 5).map((g) => (
                    <li key={g.id} className="flex justify-between">
                      <Link
                        className="font-medium underline-offset-4 hover:underline"
                        href={`/app/productivity/goals/${g.id}`}
                      >
                        {g.title}
                      </Link>
                      <span>
                        {calculateGoalProgress(
                          g.steps.map((s) => s.isCompleted),
                          g.manualProgress,
                        )}
                        %
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>{t("Belum ada tujuan aktif.", "No active goals yet.")}</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("Kebiasaan hari ini", "Today's habits")}</CardTitle>
            </CardHeader>
            <CardContent>
              {habits.length ? (
                <ul className="space-y-2">
                  {habits
                    .filter((h) => h.status === "active")
                    .slice(0, 5)
                    .map((h) => (
                      <li key={h.id}>
                        {h.name} ·{" "}
                        {h.checkins.some((c) => c.localDate === h.today)
                          ? "✓"
                          : "○"}
                      </li>
                    ))}
                </ul>
              ) : (
                <p>{t("Belum ada kebiasaan.", "No habits yet.")}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {tab === "goals" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>{t("Tambah tujuan", "Add goal")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createGoal} className="space-y-3">
                <Input
                  name="title"
                  required
                  placeholder={t("Judul", "Title")}
                />
                <Textarea
                  name="description"
                  placeholder={t(
                    "Deskripsi (opsional)",
                    "Description (optional)",
                  )}
                />
                <Input
                  name="lifeArea"
                  required
                  placeholder={t("Area hidup", "Life area")}
                />
                <Input name="deadline" type="date" />
                <select
                  name="priority"
                  className="h-10 w-full rounded-md border bg-background px-3"
                >
                  <option value="low">{t("Rendah", "Low")}</option>
                  <option value="medium">{t("Sedang", "Medium")}</option>
                  <option value="high">{t("Tinggi", "High")}</option>
                </select>
                <Input
                  name="manualProgress"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue="0"
                />
                <Button type="submit" className="w-full">
                  {t("Tambah tujuan", "Add goal")}
                </Button>
              </form>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {goals.length ? (
              goals.map((g) => (
                <Card key={g.id}>
                  <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link
                        href={`/app/productivity/goals/${g.id}`}
                        className="font-semibold hover:underline"
                      >
                        {g.title}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        {g.lifeArea} ·{" "}
                        {calculateGoalProgress(
                          g.steps.map((s) => s.isCompleted),
                          g.manualProgress,
                        )}
                        %
                      </p>
                    </div>
                    <form action={setStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={g.id} />
                      <select
                        name="status"
                        defaultValue={g.status}
                        className="h-9 rounded-md border bg-background px-2"
                      >
                        <option value="not_started">
                          {t("Belum mulai", "Not started")}
                        </option>
                        <option value="in_progress">
                          {t("Berjalan", "In progress")}
                        </option>
                        <option value="achieved">
                          {t("Tercapai", "Achieved")}
                        </option>
                        <option value="deferred">
                          {t("Ditunda", "Deferred")}
                        </option>
                        <option value="cancelled">
                          {t("Dibatalkan", "Cancelled")}
                        </option>
                      </select>
                      <Button size="sm">{t("Simpan", "Save")}</Button>
                    </form>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="pt-6">
                  {t("Belum ada tujuan.", "No goals yet.")}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
      {tab === "habits" && (
        <HabitsSection
          t={t}
          goals={goals.map((g) => ({ id: g.id, title: g.title }))}
        />
      )}
    </div>
  );
}
