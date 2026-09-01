import Link from "next/link";
import { CalendarCheck2, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function TodayFocusCard({
  activeGoals,
  scheduledHabits,
  completedHabits,
  t,
}: {
  activeGoals: number;
  scheduledHabits: number;
  completedHabits: number;
  t: (id: string, en: string) => string;
}) {
  const habitLabel = scheduledHabits ? `${completedHabits}/${scheduledHabits}` : t("Belum ada", "None yet");
  const recap = scheduledHabits === 0 ? t("Siap mulai", "Ready when you are") : completedHabits === scheduledHabits ? t("Great work", "Great work") : completedHabits > 0 ? t("Teruskan", "Keep going") : t("Mulai dari satu", "Start with one");
  return (
    <Card className="rounded-3xl border-violet-100 bg-gradient-to-br from-violet-50/80 via-card to-card shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <CalendarCheck2 className="size-5 text-violet-600" />
          {t("Fokus Hari Ini", "Today's focus")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("Selesaikan satu langkah kecil sebelum hari berakhir.", "Finish one small step before the day ends.")}</p>
        <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">{t("Rekap Hari Ini", "Daily recap")}: {recap}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <Link href="/app/productivity?tab=habits" className="group rounded-2xl border bg-background/80 p-4 transition hover:border-violet-300 hover:shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("Kebiasaan hari ini", "Today's habits")}</p>
          <p className="mt-1 text-xl font-bold">{habitLabel}</p>
          <p className="mt-1 text-xs font-semibold text-violet-600 group-hover:text-violet-700">{t("Buka check-in", "Check habits")} →</p>
        </Link>
        <Link href="/app/productivity?tab=goals" className="group rounded-2xl border bg-background/80 p-4 transition hover:border-violet-300 hover:shadow-sm">
          <p className="text-xs font-medium text-muted-foreground">{t("Tujuan aktif", "Active goals")}</p>
          <p className="mt-1 flex items-center gap-2 text-xl font-bold"><Target className="size-5 text-violet-600" />{activeGoals}</p>
          <p className="mt-1 text-xs font-semibold text-violet-600 group-hover:text-violet-700">{t("Pilih langkah berikutnya", "Update a goal")} →</p>
        </Link>
      </CardContent>
    </Card>
  );
}

export function GoalStarterLinks({ t }: { t: (id: string, en: string) => string }) {
  return <div className="flex flex-wrap gap-2 text-xs">
    <Button asChild size="sm" variant="outline" className="rounded-xl"><Link href="/app/productivity?tab=goals">{t("Dana darurat", "Emergency fund")}</Link></Button>
    <Button asChild size="sm" variant="outline" className="rounded-xl"><Link href="/app/productivity?tab=goals">{t("Belajar skill", "Learn a skill")}</Link></Button>
    <Button asChild size="sm" variant="outline" className="rounded-xl"><Link href="/app/productivity?tab=goals">{t("Kesehatan", "Health")}</Link></Button>
  </div>;
}
