import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function WeeklyReviewCard({ rate, goalSummary, headline, attentionHabit, focusGoal, stagnantGoals, t }: {
  rate: number; goalSummary: string; headline: string; attentionHabit: string | null; focusGoal: string | null; stagnantGoals: number;
  t: (id: string, en: string) => string;
}) {
  return <Card className="rounded-3xl border bg-card shadow-sm">
    <CardHeader className="pb-3"><CardTitle className="text-base">{t("Review Mingguan", "Weekly review")}</CardTitle><p className="text-sm font-semibold text-violet-600">{headline}</p></CardHeader>
    <CardContent className="space-y-3">
      <div className="flex items-end justify-between"><span className="text-sm text-muted-foreground">{t("Konsistensi kebiasaan", "Habit consistency")}</span><strong className="text-2xl">{rate}%</strong></div>
      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} /></div>
      <p className="text-sm text-muted-foreground">{goalSummary}</p>
      <p className="text-xs text-muted-foreground">{stagnantGoals} {t("tujuan tanpa progress 7 hari", "goals without progress for 7 days")}</p>
      {attentionHabit && <p className="text-xs text-amber-700 dark:text-amber-300">{t("Perlu perhatian", "Needs attention")}: {attentionHabit}</p>}
      {focusGoal && <p className="text-xs text-violet-700 dark:text-violet-300">{t("Fokus berikutnya", "Next focus")}: {focusGoal}</p>}
      <Button asChild variant="outline" className="rounded-xl"><Link href="/app/productivity?tab=habits">{t("Lihat aktivitas", "Review activity")} →</Link></Button>
    </CardContent>
  </Card>;
}

export function StreakRecoveryCard({ t }: { t: (id: string, en: string) => string }) {
  return <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t("Satu hari terlewat bukan gagal. Kembali hari ini untuk menjaga ritme.", "One missed day is not failure. Come back today to keep your rhythm.")}</p>;
}
