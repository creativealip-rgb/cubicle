"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Clock, Pause, Play, Square } from "lucide-react";
import { toast } from "sonner";
import { pauseTimer, resumeTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { StopTimerDialog, type TimerFormClient, type TimerFormProject, type TimerFormTask } from "@/components/time/stop-timer-dialog";

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

export function ActiveTimerCard({ initialTimer, clients, projects, tasks }: {
  initialTimer: ActiveTimer | null;
  clients: TimerFormClient[];
  projects: TimerFormProject[];
  tasks: TimerFormTask[];
}) {
  const router = useRouter();
  const [timer, setTimer] = useState(initialTimer);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [, setTick] = useState(0);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async () => {
    const response = await fetch("/api/time/active", { cache: "no-store" });
    if (response.ok) setTimer(((await response.json()) as { activeTimer: ActiveTimer | null }).activeTimer);
  }, []);

  useEffect(() => {
    const sync = () => { void load(); router.refresh(); };
    window.addEventListener("cubicle:timer-changed", sync);
    return () => window.removeEventListener("cubicle:timer-changed", sync);
  }, [load, router]);

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
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Aksi timer gagal");
      }
    });
  }

  const paused = Boolean(timer.pausedAt);
  return <>
    <section className="rounded-lg border bg-card p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary"><Clock className="h-4 w-4" />Timer aktif</div>
          <p className="mt-1 truncate text-sm font-medium">{timer.projectName || "Tanpa proyek"}{timer.taskTitle ? ` · ${timer.taskTitle}` : " · Tanpa task"}</p>
          {timer.description && <p className="truncate text-xs text-muted-foreground">{timer.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <strong className="min-w-24 font-mono text-lg tabular-nums">{formatElapsed(timer.startTime, timer.pausedAt)}</strong>
          {paused ? <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resumeTimer(timer.id), "Timer dilanjutkan")}><Play className="mr-1 h-4 w-4" />Lanjutkan</Button> : <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => pauseTimer(timer.id), "Timer dijeda")}><Pause className="mr-1 h-4 w-4" />Jeda</Button>}
          <Button size="sm" variant="destructive" disabled={pending} onClick={() => setStopDialogOpen(true)}><Square className="mr-1 h-4 w-4" />Hentikan</Button>
        </div>
      </div>
    </section>
    <StopTimerDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen} prefill={{ entryId: timer.id, clientId: timer.clientId, projectId: timer.projectId, taskId: timer.taskId, description: timer.description }} clients={clients} projects={projects} tasks={tasks} onStopped={() => { setTimer(null); window.dispatchEvent(new CustomEvent("cubicle:timer-changed")); router.refresh(); }} />
  </>;
}
