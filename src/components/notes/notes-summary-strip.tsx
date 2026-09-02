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
      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Catatan Aktif", "Open Notes")}
          </span>
          <FileText className="size-4 text-violet-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {open}
          </span>
          <span className="text-xs text-muted-foreground">
            {open === 1 ? t("catatan", "note") : t("catatan", "notes")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Tenggat Dekat", "Due Soon (7d)")}
          </span>
          <CalendarClock className="size-4 text-amber-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {dueSoon}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("dalam 7 hari", "next 7 days")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Disematkan", "Pinned")}
          </span>
          <Pin className="size-4 text-blue-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {pinned}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("prioritas", "priority")}
          </span>
        </div>
      </Card>

      <Card className="rounded-2xl border bg-card p-3 shadow-sm transition hover:shadow-md sm:p-4">
        <div className="flex items-center justify-between gap-2 text-muted-foreground">
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("Selesai", "Completed")}
          </span>
          <CheckCircle2 className="size-4 text-emerald-500" />
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {done}
          </span>
          <span className="text-xs text-muted-foreground">
            {t("diselesaikan", "done")}
          </span>
        </div>
      </Card>
    </div>
  );
}
