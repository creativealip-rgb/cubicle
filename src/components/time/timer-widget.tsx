"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startTimer, pauseTimer, resumeTimer, discardTimer } from "@/lib/actions/time";
import {
  StopTimerDialog,
  type StopTimerPrefill,
} from "@/components/time/stop-timer-dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Square,
  Clock,
  Loader2,
  Pause,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId?: string | null;
  billingType?: string | null;
  rate?: string | null;
}

interface Task {
  id: string;
  title: string;
  projectId?: string | null;
}

interface ActiveTimer {
  id: string;
  clientId: string | null;
  projectId: string | null;
  taskId: string | null;
  description: string | null;
  tags?: string | null;
  startTime: Date | string;
  pausedAt?: Date | string | null;
  clientName: string | null;
  projectName: string | null;
  taskTitle: string | null;
}

interface TimerWidgetProps {
  workspaceId: string;
  userId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  initialTimer: ActiveTimer | null;
}

function formatElapsed(
  startTime: Date | string | null | undefined,
  pausedAt?: Date | string | null,
): string {
  if (!startTime) return "--:--:--";
  const start = new Date(startTime).getTime();
  if (!Number.isFinite(start) || start <= 0) return "--:--:--";
  const endMs = pausedAt ? new Date(pausedAt).getTime() : Date.now();
  if (!Number.isFinite(endMs) || endMs <= 0) return "--:--:--";
  const diff = Math.max(0, Math.floor((endMs - start) / 1000));
  const capped = Math.min(diff, 99 * 3600 + 59 * 60 + 59);
  const h = Math.floor(capped / 3600);
  const m = Math.floor((capped % 3600) / 60);
  const s = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isStaleTimer(timer: ActiveTimer | null): boolean {
  if (!timer) return false;
  if (!timer.startTime) return true;
  const start = new Date(timer.startTime).getTime();
  if (!Number.isFinite(start) || start <= 0) return true;
  const endMs = timer.pausedAt ? new Date(timer.pausedAt).getTime() : Date.now();
  return endMs - start > 24 * 3600 * 1000;
}

export function TimerWidget({
  workspaceId,
  // eslint-disable-next-line unused-imports/no-unused-vars
  userId,
  clients,
  projects: allProjects,
  tasks: allTasks,
  initialTimer,
}: TimerWidgetProps) {
  const router = useRouter();
  const { t } = useT();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(initialTimer);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);
  const [stopOpen, setStopOpen] = useState(false);
  const selfDispatched = useRef(false);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  const selectedProject = allProjects.find((p) => p.id === selectedProjectId);
  const isHourly = selectedProject?.billingType === "hours";
  const isPaused = Boolean(activeTimer?.pausedAt);
  const isEmptyTimer =
    !!activeTimer && !activeTimer.clientId && !activeTimer.projectId;

  useEffect(() => {
    if (selectedClientId) {
      setFilteredProjects(allProjects.filter((p) => p.clientId === selectedClientId));
      setSelectedProjectId("");
      setSelectedTaskId("__none__");
    } else {
      setFilteredProjects([]);
      setSelectedProjectId("");
      setSelectedTaskId("__none__");
    }
  }, [selectedClientId, allProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      setFilteredTasks(allTasks.filter((tk) => tk.projectId === selectedProjectId));
      setSelectedTaskId("__none__");
    } else {
      setFilteredTasks([]);
      setSelectedTaskId("__none__");
    }
  }, [selectedProjectId, allTasks]);

  const loadActiveFromApi = useCallback(async () => {
    try {
      const res = await fetch("/api/time/active", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as {
        activeTimer: ActiveTimer | null;
      };
      setActiveTimer(data.activeTimer);
    } catch {
      // ignore poll errors
    }
  }, []);

  // Sync from navbar / other tabs: refetch, jangan hard-null
  useEffect(() => {
    function onTimerChanged() {
      if (selfDispatched.current) {
        selfDispatched.current = false;
        return;
      }
      void loadActiveFromApi();
      router.refresh();
    }
    window.addEventListener("cubicle:timer-changed", onTimerChanged);
    return () => window.removeEventListener("cubicle:timer-changed", onTimerChanged);
  }, [loadActiveFromApi, router]);

  // Tick — freeze saat pause
  useEffect(() => {
    if (!activeTimer) {
      setElapsed("00:00:00");
      return;
    }
    setElapsed(formatElapsed(activeTimer.startTime, activeTimer.pausedAt));
    if (activeTimer.pausedAt) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeTimer.startTime, activeTimer.pausedAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStart = useCallback(async () => {
    if (!selectedClientId || !selectedProjectId) {
      toast.error(t("Pilih klien dan proyek", "Select a client and project"));
      return;
    }
    setLoading(true);
    try {
      const entry = await startTimer({
        workspaceId,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        taskId: selectedTaskId && selectedTaskId !== "__none__" ? selectedTaskId : undefined,
        description: description || undefined,
        tags: tags || undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });

      const client = clients.find((c) => c.id === selectedClientId);
      const project = allProjects.find((p) => p.id === selectedProjectId);
      const task = allTasks.find((tk) => tk.id === selectedTaskId);

      setActiveTimer({
        id: entry.id,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        taskId: selectedTaskId && selectedTaskId !== "__none__" ? selectedTaskId : null,
        description: description || null,
        tags: tags || null,
        startTime: entry.startTime!,
        pausedAt: null,
        clientName: client?.name ?? null,
        projectName: project?.name ?? null,
        taskTitle: task?.title ?? null,
      });
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dimulai", "Timer started"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memulai timer", "Failed to start timer"));
    } finally {
      setLoading(false);
    }
  }, [
    selectedClientId,
    selectedProjectId,
    selectedTaskId,
    description,
    tags,
    hourlyRate,
    workspaceId,
    clients,
    allProjects,
    allTasks,
    router,
    t,
  ]);

  const handleStartEmpty = useCallback(async () => {
    setLoading(true);
    try {
      const entry = await startTimer({ workspaceId });
      setActiveTimer({
        id: entry.id,
        clientId: null,
        projectId: null,
        taskId: null,
        description: null,
        tags: null,
        startTime: entry.startTime!,
        pausedAt: null,
        clientName: null,
        projectName: null,
        taskTitle: null,
      });
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer kosong dimulai", "Empty timer started"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memulai timer", "Failed to start timer"));
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router, t]);

  const handlePause = useCallback(async () => {
    if (!activeTimer || loading) return;
    setLoading(true);
    try {
      const updated = await pauseTimer(activeTimer.id);
      if ("discarded" in updated && updated.discarded) {
        setActiveTimer(null);
      } else {
        setActiveTimer((prev) =>
          prev
            ? {
                ...prev,
                pausedAt: (updated as { pausedAt?: Date | string | null }).pausedAt ?? new Date().toISOString(),
                startTime: (updated as { startTime?: Date | string | null }).startTime ?? prev.startTime,
              }
            : prev,
        );
      }
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dijeda", "Timer paused"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal jeda timer", "Failed to pause timer"));
    } finally {
      setLoading(false);
    }
  }, [activeTimer, loading, t]);

  const handleResume = useCallback(async () => {
    if (!activeTimer || loading) return;
    setLoading(true);
    try {
      const updated = await resumeTimer(activeTimer.id);
      if ("discarded" in updated && updated.discarded) {
        setActiveTimer(null);
      } else {
        setActiveTimer((prev) =>
          prev
            ? {
                ...prev,
                pausedAt: null,
                startTime: (updated as { startTime?: Date | string | null }).startTime ?? prev.startTime,
              }
            : prev,
        );
      }
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dilanjut", "Timer resumed"));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal lanjut timer", "Failed to resume timer"));
    } finally {
      setLoading(false);
    }
  }, [activeTimer, loading, t]);

  const handleDiscard = useCallback(async () => {
    if (!activeTimer) return;
    setLoading(true);
    try {
      await discardTimer(activeTimer.id);
      setActiveTimer(null);
      setElapsed("00:00:00");
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dibuang", "Timer discarded"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuang timer", "Failed to discard timer"));
    } finally {
      setLoading(false);
    }
  }, [activeTimer, router, t]);

  const stopPrefill: StopTimerPrefill | null = activeTimer
    ? {
        entryId: activeTimer.id,
        clientId: activeTimer.clientId,
        projectId: activeTimer.projectId,
        taskId: activeTimer.taskId,
        description: activeTimer.description,
        tags: activeTimer.tags,
      }
    : null;

  return (
    <>
      <Card>
        <CardContent className="p-6">
          {activeTimer ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      isStaleTimer(activeTimer)
                        ? "bg-amber-500"
                        : isPaused
                          ? "bg-amber-500"
                          : "bg-red-500 animate-pulse"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      isStaleTimer(activeTimer)
                        ? "text-amber-700"
                        : isPaused
                          ? "text-amber-700"
                          : "text-red-600"
                    }`}
                  >
                    {isStaleTimer(activeTimer)
                      ? t("Basi (24j+)", "Stale (24h+)")
                      : isPaused
                        ? t("Dijeda", "Paused")
                        : t("Merekam", "Recording")}
                  </span>
                  {isEmptyTimer && (
                    <Badge variant="outline" className="text-[10px]">
                      {t("Belum diisi", "Not filled")}
                    </Badge>
                  )}
                </div>
                <span className="text-3xl font-mono font-bold tabular-nums">{elapsed}</span>
              </div>

              {isStaleTimer(activeTimer) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  {t(
                    "Timer ini sudah jalan lebih dari 24 jam. Hentikan lalu mulai ulang, atau buang kalau nyala nggak sengaja.",
                    "This timer has been running for over 24 hours. Stop and restart, or discard if it was left on by accident.",
                  )}
                </div>
              )}

              {isEmptyTimer ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Timer kosong — lengkapi client, project, task, deskripsi saat stop.",
                    "Empty timer — fill client, project, task, description on stop.",
                  )}
                </p>
              ) : (
                <div className="text-sm text-muted-foreground space-y-0.5">
                  {activeTimer.clientName && (
                    <p>
                      {t("Klien", "Client")}: {activeTimer.clientName}
                    </p>
                  )}
                  {activeTimer.projectName && (
                    <p>
                      {t("Proyek", "Project")}: {activeTimer.projectName}
                    </p>
                  )}
                  {activeTimer.taskTitle && (
                    <p>
                      {t("Tugas", "Task")}: {activeTimer.taskTitle}
                    </p>
                  )}
                  {activeTimer.description && (
                    <p>
                      {t("Catatan", "Note")}: {activeTimer.description}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {isPaused ? (
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2 min-w-[120px]"
                    onClick={handleResume}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    {t("Lanjut", "Resume")}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="lg"
                    className="flex-1 gap-2 min-w-[120px]"
                    onClick={handlePause}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                    {t("Jeda", "Pause")}
                  </Button>
                )}
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1 gap-2 min-w-[140px]"
                  onClick={() => setStopOpen(true)}
                  disabled={loading}
                >
                  <Square className="h-4 w-4" />
                  {t("Hentikan", "Stop")}
                </Button>
                {(isStaleTimer(activeTimer) || isEmptyTimer) && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDiscard}
                    disabled={loading}
                    title={t("Buang timer tanpa menyimpan", "Discard timer without saving")}
                  >
                    {t("Buang", "Discard")}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">{t("Mulai Timer", "Start Timer")}</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Klien", "Client")}</Label>
                  <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("Pilih klien", "Select client")} />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Proyek", "Project")}</Label>
                  <Select
                    value={selectedProjectId}
                    onValueChange={setSelectedProjectId}
                    disabled={!selectedClientId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("Pilih proyek", "Select project")} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredProjects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tugas (opsional)", "Task (optional)")}</Label>
                  <Select
                    value={selectedTaskId}
                    onValueChange={setSelectedTaskId}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("Pilih tugas", "Select task")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                      {filteredTasks.map((tk) => (
                        <SelectItem key={tk.id} value={tk.id}>
                          {tk.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("Lagi ngerjain apa?", "What are you working on?")}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">{t("Tag (opsional)", "Tags (optional)")}</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("Riset, Follow Up", "Research, Follow Up")}
                  className="h-9"
                />
                <div className="flex flex-wrap gap-1.5">
                  {["Research", "Cold Calling", "Follow Up - Phone", "Task Reporting"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      className="rounded-full border bg-background px-2 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:text-foreground"
                      onClick={() => {
                        const parts = tags
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        if (parts.includes(preset)) return;
                        setTags([...parts, preset].join(", "));
                      }}
                    >
                      + {preset}
                    </button>
                  ))}
                </div>
              </div>

              {isHourly && (
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tarif per jam", "Hourly rate")}</Label>
                  <Input
                    type="number"
                    min="0"
                    step="1000"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    placeholder={selectedProject?.rate ? String(selectedProject.rate) : "e.g. 150000"}
                    className="h-9"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("Kosongkan untuk pakai tarif proyek.", "Leave empty to use the project rate.")}
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1 gap-2"
                  onClick={handleStart}
                  disabled={loading || !selectedClientId || !selectedProjectId}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t("Mulai dengan detail", "Start with details")}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleStartEmpty}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t("Mulai kosong", "Start empty")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Mulai kosong = isi client/project/task/deskripsi saat stop. Batal form stop = timer tetap jalan.",
                  "Start empty = fill client/project/task/description on stop. Cancel stop form keeps timer running.",
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <StopTimerDialog
        open={stopOpen}
        onOpenChange={setStopOpen}
        prefill={stopPrefill}
        clients={clients}
        projects={allProjects}
        tasks={allTasks}
        onStopped={() => {
          setActiveTimer(null);
          setElapsed("00:00:00");
          setStopOpen(false);
          selfDispatched.current = true;
          window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
          router.refresh();
        }}
      />
    </>
  );
}
