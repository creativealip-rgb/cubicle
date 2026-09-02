import Link from "next/link";
import { calculateGoalProgress } from "@/lib/personal-productivity/goals";
import { getDeadlineStatus, GoalItemLike } from "@/lib/personal-productivity/visuals";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

interface GoalProgressCardProps {
  goal: GoalItemLike;
  today: string;
  setStatusAction: (fd: FormData) => Promise<void>;
  compact?: boolean;
  t: (id: string, en: string) => string;
}

const PRIORITY_COLORS = {
  high: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900",
  medium: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900",
  low: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800",
};

export function GoalProgressCard({
  goal,
  today,
  setStatusAction,
  compact = false,
  t,
}: GoalProgressCardProps) {
  const progress = calculateGoalProgress(
    goal.steps.map((s) => s.isCompleted),
    goal.manualProgress,
  );
  const deadline = getDeadlineStatus(goal.deadline, today);
  const effectiveStatus = goal.status === "not_started" && progress > 0 ? "in_progress" : goal.status;
  const priorityClass =
    PRIORITY_COLORS[(goal.priority as "high" | "medium" | "low") || "medium"];

  if (compact) {
    return (
      <div className="group rounded-2xl border bg-muted/20 p-3.5 transition hover:border-violet-200 hover:bg-muted/40 dark:hover:border-violet-900/50">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {goal.lifeArea || t("Umum", "General")}
              </span>
              <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${priorityClass}`}>
                {t(
                  goal.priority === "high"
                    ? "Tinggi"
                    : goal.priority === "low"
                      ? "Rendah"
                      : "Sedang",
                  goal.priority || "Medium",
                )}
              </span>
              <span className="text-[11px] text-muted-foreground">
                {goal.steps.length > 0
                  ? `${goal.steps.filter((s) => s.isCompleted).length}/${goal.steps.length} ${t("langkah", "steps")}`
                  : null}
              </span>
            </div>
            <Link
              href={`/app/productivity/goals/${goal.id}`}
              className="block truncate text-sm font-semibold tracking-tight text-foreground transition group-hover:text-violet-600 hover:underline"
            >
              {goal.title}
            </Link>
          </div>

          <div className="text-right shrink-0">
            <span className="text-sm font-bold text-foreground">{progress}%</span>
          </div>
        </div>

        {/* Compact Progress Bar */}
        <div className="mt-2.5 relative h-2 w-full overflow-hidden rounded-full bg-muted/70">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100
                ? "bg-emerald-500"
                : progress >= 50
                  ? "bg-gradient-to-r from-violet-600 to-emerald-500"
                  : "bg-gradient-to-r from-violet-700 to-violet-500"
            }`}
            style={{ width: `${Math.max(progress, 2)}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="size-3" />
            <span className={deadline.isOverdue ? "font-semibold text-red-600" : deadline.isUrgent ? "font-semibold text-amber-600" : ""}>
              {deadline.label}
            </span>
          </div>

          <Link
            href={`/app/productivity/goals/${goal.id}`}
            className="font-medium text-violet-600 hover:underline flex items-center gap-0.5"
          >
            {t("Detail", "Details")} <ArrowRight className="size-3" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden rounded-3xl border bg-card shadow-sm transition hover:shadow-md">
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {goal.lifeArea || t("Umum", "General")}
              </span>
              <span
                className={`rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${priorityClass}`}
              >
                {t(
                  goal.priority === "high"
                    ? "Tinggi"
                    : goal.priority === "low"
                      ? "Rendah"
                      : "Sedang",
                  goal.priority || "Medium",
                )}
              </span>
            </div>
            <Link
              href={`/app/productivity/goals/${goal.id}`}
              className="text-lg font-bold tracking-tight text-foreground transition hover:text-violet-600 hover:underline"
            >
              {goal.title}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <form action={setStatusAction} className="flex items-center gap-2">
              <input type="hidden" name="id" value={goal.id} />
              <select
                name="status"
                defaultValue={effectiveStatus}
                className="h-9 rounded-xl border bg-background px-2.5 text-xs font-medium"
              >
                <option value="not_started">
                  {t("Belum Mulai", "Not Started")}
                </option>
                <option value="in_progress">
                  {t("Berjalan", "In Progress")}
                </option>
                <option value="achieved">{t("Tercapai", "Achieved")}</option>
                <option value="deferred">{t("Ditunda", "Deferred")}</option>
                <option value="cancelled">{t("Batal", "Cancelled")}</option>
              </select>
              <Button size="sm" variant="outline" className="h-9 rounded-xl">
                {t("Ubah", "Update")}
              </Button>
            </form>
          </div>
        </div>

        {/* Visual Progress Bar & Milestones indicator */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-muted-foreground">
              {goal.steps.length > 0
                ? `${goal.steps.filter((s) => s.isCompleted).length}/${goal.steps.length} ${t("langkah selesai", "steps completed")}`
                : t("Progress target", "Target Progress")}
            </span>
            <span className="font-bold text-foreground">{progress}%</span>
          </div>

          {/* Progress bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progress >= 100
                  ? "bg-emerald-500"
                  : progress >= 50
                    ? "bg-gradient-to-r from-violet-600 to-emerald-500"
                    : "bg-gradient-to-r from-violet-700 to-violet-500"
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>
        </div>

        {/* Footer Meta: Deadline & Link */}
        <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" />
            <span
              className={
                deadline.isOverdue
                  ? "font-semibold text-red-600 dark:text-red-400"
                  : deadline.isUrgent
                    ? "font-semibold text-amber-600 dark:text-amber-400"
                    : ""
              }
            >
              {deadline.label}
            </span>
          </div>

          <Link
            href={`/app/productivity/goals/${goal.id}`}
            className="flex items-center gap-1 font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400"
          >
            <span>{t("Detail & Langkah", "Details & Steps")}</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
