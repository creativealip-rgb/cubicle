import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addPersonalGoalStep,
  deletePersonalGoalStep,
  getPersonalGoal,
  hardDeletePersonalGoal,
  renamePersonalGoalStep,
  togglePersonalGoalStep,
  updatePersonalGoal,
} from "@/lib/actions/personal-goals";
import { calculateGoalProgress } from "@/lib/personal-productivity/goals";
import { getCurrentLang, createT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default async function GoalDetail({
  params,
}: {
  params: Promise<{ goalId: string }>;
}) {
  const { goalId } = await params,
    goal = await getPersonalGoal(goalId);
  if (!goal) notFound();
  const lang = await getCurrentLang(),
    t = createT(lang);
  const progress = calculateGoalProgress(
    goal.steps.map((s) => s.isCompleted),
    goal.manualProgress,
  );
  async function edit(fd: FormData) {
    "use server";
    await updatePersonalGoal(goalId, {
      title: String(fd.get("title")),
      description: String(fd.get("description") || "") || null,
      lifeArea: String(fd.get("lifeArea")),
      deadline: String(fd.get("deadline") || "") || null,
      priority: String(fd.get("priority")) as "low" | "medium" | "high",
      reward: String(fd.get("reward") || "") || null,
      status: String(fd.get("status")) as
        "not_started" | "in_progress" | "achieved" | "deferred" | "cancelled",
      manualProgress: Number(fd.get("manualProgress") || 0),
    });
  }
  async function addStep(fd: FormData) {
    "use server";
    await addPersonalGoalStep(goalId, { title: String(fd.get("title")) });
  }
  async function toggle(fd: FormData) {
    "use server";
    await togglePersonalGoalStep(
      String(fd.get("stepId")),
      fd.get("completed") !== "true",
    );
  }
  async function renameStep(fd: FormData) {
    "use server";
    await renamePersonalGoalStep(String(fd.get("stepId")), { title: String(fd.get("title")) });
  }
  async function deleteStep(fd: FormData) {
    "use server";
    await deletePersonalGoalStep(String(fd.get("stepId")));
  }
  async function remove(fd: FormData) {
    "use server";
    await hardDeletePersonalGoal(goalId, String(fd.get("confirmation")));
    redirect("/app/productivity?tab=goals");
  }
  return (
    <div className="space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/app/productivity?tab=goals">← {t("Kembali", "Back")}</Link>
      </Button>
      <header>
        <h1 className="text-2xl font-semibold">{goal.title}</h1>
        <p className="text-muted-foreground">
          {t("Progres", "Progress")}: {progress}%
        </p>
        {goal.reward && (
          <p>
            {t("Hadiah", "Reward")}: {goal.reward}
          </p>
        )}
      </header>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("Detail tujuan", "Goal details")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={edit} className="space-y-3">
              <Input name="title" defaultValue={goal.title} required />
              <Textarea
                name="description"
                defaultValue={goal.description || ""}
              />
              <Input name="lifeArea" defaultValue={goal.lifeArea} required />
              <Input
                name="deadline"
                type="date"
                defaultValue={goal.deadline || ""}
              />
              <Input
                name="reward"
                defaultValue={goal.reward || ""}
                placeholder={t("Reward (opsional)", "Reward (optional)")}
              />
              <select
                name="priority"
                defaultValue={goal.priority}
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="low">{t("Rendah", "Low")}</option>
                <option value="medium">{t("Sedang", "Medium")}</option>
                <option value="high">{t("Tinggi", "High")}</option>
              </select>
              <select
                name="status"
                defaultValue={goal.status}
                className="h-10 w-full rounded-md border bg-background px-3"
              >
                <option value="not_started">
                  {t("Belum mulai", "Not started")}
                </option>
                <option value="in_progress">
                  {t("Berjalan", "In progress")}
                </option>
                <option value="achieved">{t("Tercapai", "Achieved")}</option>
                <option value="deferred">{t("Ditunda", "Deferred")}</option>
                <option value="cancelled">
                  {t("Dibatalkan", "Cancelled")}
                </option>
              </select>
              {!goal.steps.length && (
                <Input
                  name="manualProgress"
                  type="number"
                  min="0"
                  max="100"
                  defaultValue={goal.manualProgress}
                />
              )}
              <Button>{t("Simpan", "Save")}</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("Langkah", "Steps")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={addStep} className="flex gap-2">
              <Input
                name="title"
                required
                placeholder={t("Langkah baru", "New step")}
              />
              <Button>{t("Tambah", "Add")}</Button>
            </form>
            <ul className="space-y-2">
              {goal.steps.map((s) => (
                <li key={s.id} className="flex flex-col gap-2 rounded-xl border p-2 sm:flex-row">
                  <form action={toggle} className="sm:w-44">
                    <input type="hidden" name="stepId" value={s.id} />
                    <input type="hidden" name="completed" value={String(s.isCompleted)} />
                    <Button variant="outline" className="w-full justify-start rounded-lg">
                      {s.isCompleted ? "✓" : "○"} {s.title}
                    </Button>
                  </form>
                  <form action={renameStep} className="flex min-w-0 flex-1 gap-2">
                    <input type="hidden" name="stepId" value={s.id} />
                    <Input name="title" defaultValue={s.title} required aria-label={t("Edit langkah", "Edit step")} className="h-9 min-w-0" />
                    <Button size="sm" variant="outline">{t("Simpan", "Save")}</Button>
                  </form>
                  <form action={deleteStep}>
                    <input type="hidden" name="stepId" value={s.id} />
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">{t("Hapus", "Delete")}</Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("Kebiasaan pendukung", "Supporting habits")}</CardTitle>
        </CardHeader>
        <CardContent>
          {goal.habits.length ? (
            goal.habits.map((habit) => <p key={habit.id}>{habit.name}</p>)
          ) : (
            <p>{t("Belum ada kebiasaan terkait.", "No linked habits yet.")}</p>
          )}
        </CardContent>
      </Card>
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>{t("Hapus permanen", "Delete permanently")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={remove} className="flex flex-col gap-2 sm:flex-row">
            <Input name="confirmation" required placeholder={goal.title} />
            <Button variant="destructive">
              {t("Hapus tujuan", "Delete goal")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
