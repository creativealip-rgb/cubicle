import { Card } from "@/components/ui/card";
import { FileText, CalendarClock, Pin, CheckCircle2 } from "lucide-react";

export function NotesSummaryStrip({
  open,
  dueSoon,
  pinned,
  done,
  t,
}: {
  open: number;
  dueSoon: number;
  pinned: number;
  done: number;
  t: (id: string, en: string) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition hover:border-violet-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("Catatan Aktif", "Open Notes")}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <FileText className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {open}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {open === 1 ? t("catatan", "note") : t("catatan", "notes")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition hover:border-amber-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("Tenggat Dekat", "Due Soon (7d)")}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarClock className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {dueSoon}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t("dalam 7 hari", "next 7 days")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition hover:border-blue-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("Disematkan", "Pinned")}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Pin className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {pinned}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t("prioritas", "priority")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-2xs transition hover:border-emerald-500/40 hover:shadow-xs">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("Selesai", "Completed")}
          </span>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {done}
          </span>
          <span className="text-xs text-muted-foreground font-medium">
            {t("diselesaikan", "done")}
          </span>
        </div>
      </Card>
    </div>
  );
}
