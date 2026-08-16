"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Clock, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { pauseTimer, resumeTimer, stopTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import type { TimerFormClient, TimerFormProject, TimerFormTask } from "@/components/time/stop-timer-dialog";
import { useT } from "@/lib/i18n-client";

type ActiveTimer = {
  id: string;
  clientId: string | null;
  projectId: string | null;
  taskId: string | null;
  projectName: string | null;
  taskTitle: string | null;
  description: string | null;
  startTime: string | Date;
  pausedAt?: string | Date | null;
};

function formatElapsed(startTime: string | Date, pausedAt?: string | Date | null) {
  const end = pausedAt ? new Date(pausedAt).getTime() : Date.now();
  const seconds = Math.max(0, Math.floor((end - new Date(startTime).getTime()) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return [hours, minutes, rest].map((value) => String(value).padStart(2, "0")).join(":");
}

export function ActiveTimerCard({ initialTimer }: {
  initialTimer: ActiveTimer | null;
  clients: TimerFormClient[];
  projects: TimerFormProject[];
  tasks: TimerFormTask[];
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [timer, setTimer] = useState(initialTimer);

  const [, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const response = await fetch("/api/time/active", { cache: "no-store" });
    if (response.ok) setTimer(((await response.json()) as { activeTimer: ActiveTimer | null }).activeTimer);
  }, []);

  useEffect(() => {
    const sync = () => { void load(); refresh(); };
    window.addEventListener("cubicle:timer-changed", sync);
    return () => window.removeEventListener("cubicle:timer-changed", sync);
  }, [load, refresh]);

  useEffect(() => {
    if (!timer || timer.pausedAt) return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(interval);
  }, [timer]);

  if (!timer) return null;

  function run(action: () => Promise<unknown>, message: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
        await load();
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Aksi timer gagal");
      }
    });
  }

  const paused = Boolean(timer.pausedAt);
  function handleStop() {
    if (!timer || pending) return;
    startTransition(async () => {
      try {
        await stopTimer(timer.id);
        setTimer(null);
        toast.success(t("Timer dihentikan. Detail bisa diisi nanti lewat timesheet.", "Timer stopped. Details can be filled later from the timesheet."));
        window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
        refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menghentikan timer");
      }
    });
  }
  return <>
    <section className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Clock className="h-4 w-4" />{t("Timer aktif", "Active timer")}</div>
          <p className="mt-1 truncate text-sm font-medium">{timer.projectName || t("Tanpa proyek", "No project")}{timer.taskTitle ? ` · ${timer.taskTitle}` : ` · ${t("Tanpa task", "No task")}`}</p>
          {timer.description && <p className="truncate text-xs text-muted-foreground">{timer.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <strong className="min-w-24 font-mono text-lg tabular-nums">{formatElapsed(timer.startTime, timer.pausedAt)}</strong>
          {paused ? <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resumeTimer(timer.id), t("Timer dilanjutkan", "Timer resumed"))}><Play className="h-4 w-4" />{t("Lanjutkan", "Resume")}</Button> : <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => pauseTimer(timer.id), t("Timer dijeda", "Timer paused"))}><Pause className="h-4 w-4" />{t("Jeda", "Pause")}</Button>}
          <Button size="sm" variant="destructive" disabled={pending} onClick={handleStop}><Square className="h-4 w-4" />{t("Hentikan", "Stop")}</Button>
        </div>
      </div>
    </section>
  </>;
}
