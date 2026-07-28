"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startTimer, pauseTimer, resumeTimer, discardTimer, stopTimer, updateActiveTimerMetadata } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StopTimerDialog } from "@/components/time/stop-timer-dialog";
import {
  Play,
  Square,
  Star,
  Clock,
  Loader2,
  Pause,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { timerCombinationKey, toggleFavoriteKey, type TimerCombination } from "@/lib/timer-combinations";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId?: string | null;
  billingType?: string | null;
  activityRequired?: boolean | null;
  rate?: string | null;
}

interface Task {
  id: string;
  title: string;
  projectId?: string | null;
}

interface Activity {
  id: string;
  name: string;
  projectId?: string | null;
  enabled?: boolean | null;
  status?: string | null;
  defaultHourlyRate?: string | number | null;
  rateOverride?: string | number | null;
}

interface ActiveTimer {
  id: string;
  clientId: string | null;
  projectId: string | null;
  activityId?: string | null;
  taskId: string | null;
  description: string | null;
  tags?: string | null;
  startTime: Date | string;
  pausedAt?: Date | string | null;
  clientName: string | null;
  projectName: string | null;
  activityName?: string | null;
  taskTitle: string | null;
}

interface TimerWidgetProps {
  workspaceId: string;
  userId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  activities?: Activity[];
  recentCombinations?: TimerCombination[];
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
  activities: allActivities = [],
  recentCombinations = [],
  initialTimer,
}: TimerWidgetProps) {
  const router = useRouter();
  const { t } = useT();
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(initialTimer);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);
  const [stopDialogOpen, setStopDialogOpen] = useState(false);
  const [editingActiveTimer, setEditingActiveTimer] = useState(false);
  const selfDispatched = useRef(false);

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedActivityId, setSelectedActivityId] = useState<string>("");
  const setActivityId = useCallback((value: string) => setSelectedActivityId(value), []);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [favoriteKeys, setFavoriteKeys] = useState<string[]>([]);

  useEffect(() => {
    try { setFavoriteKeys(JSON.parse(localStorage.getItem("cubicle:timer-favorites") || "[]")); } catch { setFavoriteKeys([]); }
  }, []);

  const applyCombination = useCallback((item: TimerCombination) => {
    setSelectedClientId(item.clientId ?? "");
    setTimeout(() => {
      setSelectedProjectId(item.projectId);
      setTimeout(() => {
        setSelectedActivityId(item.activityId ?? "");
        setSelectedTaskId(item.taskId ?? "__none__");
        setDescription(item.description ?? "");
        setTags(item.tags ?? "");
      }, 0);
    }, 0);
  }, []);

  function toggleFavorite(item: TimerCombination) {
    const next = toggleFavoriteKey(favoriteKeys, timerCombinationKey(item));
    setFavoriteKeys(next);
    localStorage.setItem("cubicle:timer-favorites", JSON.stringify(next));
  }

  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<Activity[]>([]);
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
      setActivityId("");
      setSelectedTaskId("__none__");
    } else {
      setFilteredProjects([]);
      setSelectedProjectId("");
      setActivityId("");
      setSelectedTaskId("__none__");
    }
  }, [selectedClientId, allProjects, setActivityId]);

  useEffect(() => {
    if (selectedProjectId) {
      setFilteredActivities(allActivities.filter((a) => a.projectId === selectedProjectId));
      setFilteredTasks(allTasks.filter((tk) => tk.projectId === selectedProjectId));
      setActivityId("");
      setSelectedTaskId("__none__");
    } else {
      setFilteredActivities([]);
      setFilteredTasks([]);
      setActivityId("");
      setSelectedTaskId("__none__");
    }
  }, [selectedProjectId, allTasks, allActivities, setActivityId]);

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
        activityId: selectedActivityId || null,
        taskId: selectedTaskId && selectedTaskId !== "__none__" ? selectedTaskId : undefined,
        description: description || undefined,
        tags: tags || undefined,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });

      const client = clients.find((c) => c.id === selectedClientId);
      const project = allProjects.find((p) => p.id === selectedProjectId);
      const activity = allActivities.find((a) => a.id === selectedActivityId);
      const task = allTasks.find((tk) => tk.id === selectedTaskId);

      setActiveTimer({
        id: entry.id,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        activityId: selectedActivityId || null,
        taskId: selectedTaskId && selectedTaskId !== "__none__" ? selectedTaskId : null,
        description: description || null,
        tags: tags || null,
        startTime: entry.startTime!,
        pausedAt: null,
        clientName: client?.name ?? null,
        projectName: project?.name ?? null,
        activityName: activity?.name ?? null,
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
    selectedActivityId,
    selectedTaskId,
    description,
    tags,
    hourlyRate,
    workspaceId,
    clients,
    allProjects,
    allActivities,
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
        activityId: null,
        taskId: null,
        description: null,
        tags: null,
        startTime: entry.startTime!,
        pausedAt: null,
        clientName: null,
        projectName: null,
        activityName: null,
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

  const handleStop = useCallback(async () => {
    if (!activeTimer || loading) return;
    if (isEmptyTimer) {
      setStopDialogOpen(true);
      return;
    }
    setLoading(true);
    try {
      await stopTimer(activeTimer.id);
      setActiveTimer(null);
      setElapsed("00:00:00");
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Timer dihentikan", "Timer stopped"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal hentikan timer", "Failed to stop timer"));
    } finally {
      setLoading(false);
    }
  }, [activeTimer, isEmptyTimer, loading, router, t]);

  const startEditingActiveTimer = useCallback(() => {
    if (!activeTimer) return;
    setSelectedClientId(activeTimer.clientId || "");
    setSelectedProjectId(activeTimer.projectId || "");
    setActivityId(activeTimer.activityId || "");
    setSelectedTaskId(activeTimer.taskId || "__none__");
    setDescription(activeTimer.description || "");
    setTags(activeTimer.tags || "");
    setHourlyRate("");
    setEditingActiveTimer(true);
  }, [activeTimer, setActivityId]);

  const handleSaveActiveMetadata = useCallback(async () => {
    if (!activeTimer || loading) return;
    if (!selectedClientId || !selectedProjectId) {
      toast.error(t("Pilih klien dan proyek", "Select a client and project"));
      return;
    }
    setLoading(true);
    try {
      const updated = await updateActiveTimerMetadata(activeTimer.id, {
        clientId: selectedClientId,
        projectId: selectedProjectId,
        activityId: selectedActivityId || null,
        taskId: selectedTaskId && selectedTaskId !== "__none__" ? selectedTaskId : null,
        description: description || null,
        tags: tags || null,
        hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
      });
      const client = clients.find((c) => c.id === selectedClientId);
      const project = allProjects.find((p) => p.id === selectedProjectId);
      const activity = allActivities.find((a) => a.id === selectedActivityId);
      const task = allTasks.find((tk) => tk.id === selectedTaskId);
      setActiveTimer((prev) =>
        prev
          ? {
              ...prev,
              clientId: updated.clientId ?? selectedClientId,
              projectId: updated.projectId ?? selectedProjectId,
              activityId: updated.activityId ?? (selectedActivityId || null),
              taskId: updated.taskId ?? (selectedTaskId !== "__none__" ? selectedTaskId : null),
              description: updated.description ?? (description || null),
              tags: updated.tags ?? (tags || null),
              clientName: client?.name ?? null,
              projectName: project?.name ?? null,
              activityName: activity?.name ?? null,
              taskTitle: task?.title ?? null,
            }
          : prev,
      );
      setEditingActiveTimer(false);
      selfDispatched.current = true;
      window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
      toast.success(t("Detail timer diperbarui", "Timer details updated"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menyimpan detail timer", "Failed to save timer details"));
    } finally {
      setLoading(false);
    }
  }, [
    activeTimer,
    loading,
    selectedClientId,
    selectedProjectId,
    selectedActivityId,
    selectedTaskId,
    description,
    tags,
    hourlyRate,
    clients,
    allProjects,
    allActivities,
    allTasks,
    router,
    t,
  ]);

  return (
    <>
      <Card className="rounded-lg border bg-card">
        <CardContent className="p-4">
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

              {editingActiveTimer ? (
                <div className="space-y-3 rounded-lg border bg-slate-50 p-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Klien *", "Client *")}</Label>
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
                      <Label className="text-xs">{t("Proyek", "Project")} *</Label>
                      <Select value={selectedProjectId} onValueChange={setSelectedProjectId} disabled={!selectedClientId}>
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
                      <Label className="text-xs">{t("Aktivitas", "Activity")}</Label>
                      <Select
                        value={selectedActivityId || "__none__"}
                        onValueChange={(value) => setSelectedActivityId(value === "__none__" ? "" : value)}
                        disabled={!selectedProjectId}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue placeholder={t("Pilih aktivitas", "Select activity")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                          {filteredActivities.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{t("Tugas terkait", "Related Task")}</Label>
                      <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={!selectedProjectId}>
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
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Tag", "Tags")}</Label>
                    <Input value={tags} onChange={(e) => setTags(e.target.value)} className="h-9" />
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
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleSaveActiveMetadata} disabled={loading || !selectedClientId || !selectedProjectId}>
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {t("Simpan Detail", "Save Details")}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingActiveTimer(false)} disabled={loading}>
                      {t("Batal", "Cancel")}
                    </Button>
                  </div>
                </div>
              ) : isEmptyTimer ? (
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Timer kosong — pilih klien dan Project saat menghentikan.",
                    "Empty timer — choose client and Project when stopping.",
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
                  {activeTimer.activityName && (
                    <p>
                      {t("Aktivitas", "Activity")}: {activeTimer.activityName}
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
                  variant="outline"
                  size="lg"
                  className="flex-1 gap-2 min-w-[120px]"
                  onClick={startEditingActiveTimer}
                  disabled={loading || editingActiveTimer}
                >
                  {t("Edit Detail", "Edit Details")}
                </Button>
                <Button
                  variant="destructive"
                  size="lg"
                  className="flex-1 gap-2 min-w-[140px]"
                  onClick={() => void handleStop()}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
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
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-sm font-semibold">{t("Mulai Timer", "Start Timer")}</h3>
                </div>
                <span className="font-mono text-2xl font-semibold tabular-nums">00:00:00</span>
              </div>

              {recentCombinations.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1" aria-label={t("Timer terbaru dan favorit", "Recent and favorite timers")}>
                  {[...recentCombinations].sort((a, b) => Number(favoriteKeys.includes(timerCombinationKey(b))) - Number(favoriteKeys.includes(timerCombinationKey(a)))).slice(0, 3).map((item) => {
                    const key = timerCombinationKey(item);
                    const project = allProjects.find((value) => value.id === item.projectId);
                    const activity = allActivities.find((value) => value.id === item.activityId);
                    const favorite = favoriteKeys.includes(key);
                    return (
                      <div key={key} className="flex shrink-0 items-center rounded-md border bg-muted/30">
                        <button type="button" className="px-3 py-2 text-left text-xs" onClick={() => applyCombination(item)}>
                          <span className="block font-medium">{project?.name ?? t("Proyek", "Project")}</span>
                          <span className="text-muted-foreground">{activity?.name ?? item.description ?? t("Tanpa aktivitas", "No activity")}</span>
                        </button>
                        <button type="button" className="p-2" aria-label={favorite ? t("Hapus favorit", "Remove favorite") : t("Jadikan favorit", "Add favorite")} onClick={() => toggleFavorite(item)}>
                          <Star className={`h-4 w-4 ${favorite ? "fill-amber-400 text-amber-500" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("Apa yang sedang dikerjakan?", "What are you working on?")} className="h-11 text-base" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  <Label className="text-xs">{t("Aktivitas", "Activity")}</Label>
                  <Select
                    value={selectedActivityId || "__none__"}
                    onValueChange={(value) => setSelectedActivityId(value === "__none__" ? "" : value)}
                    disabled={!selectedProjectId}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder={t("Pilih aktivitas", "Select activity")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                      {filteredActivities.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tugas terkait", "Related Task")}</Label>
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

              <details className="rounded-lg border bg-muted/20 p-3">
                <summary className="cursor-pointer text-sm font-medium">{t("Opsi lainnya", "More options")}</summary>
                <div className="mt-3 space-y-1.5">
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
                  <Input type="number" min="0" step="1000" value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} placeholder={selectedProject?.rate ? String(selectedProject.rate) : "e.g. 150000"} className="h-9" />
                  <p className="text-[11px] text-muted-foreground">{t("Kosongkan untuk pakai tarif proyek.", "Leave empty to use the project rate.")}</p>
                </div>
              )}
              </details>

              <div className="flex">
                <Button className="w-full gap-2 sm:w-auto sm:min-w-48" onClick={selectedClientId && selectedProjectId ? handleStart : handleStartEmpty} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                  {t("Mulai Timer", "Start Timer")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <StopTimerDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        prefill={activeTimer ? {
          entryId: activeTimer.id,
          clientId: activeTimer.clientId,
          projectId: activeTimer.projectId,
          activityId: activeTimer.activityId,
          taskId: activeTimer.taskId,
          description: activeTimer.description,
          tags: activeTimer.tags,
        } : null}
        clients={clients}
        projects={allProjects}
        tasks={allTasks}
        activities={allActivities}
        onStopped={() => {
          setActiveTimer(null);
          setElapsed("00:00:00");
          selfDispatched.current = true;
          window.dispatchEvent(new CustomEvent("cubicle:timer-changed"));
          router.refresh();
        }}
      />
    </>
  );
}
