"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { startTimer, stopTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Play,
  Square,
  Clock,
  Loader2,
} from "lucide-react";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Task {
  id: string;
  title: string;
}

interface ActiveTimer {
  id: string;
  clientId: string;
  projectId: string;
  taskId: string | null;
  description: string | null;
  startTime: Date | string;
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

function formatElapsed(startTime: Date | string | null | undefined): string {
  if (!startTime) return "--:--:--";
  const start = new Date(startTime).getTime();
  if (!Number.isFinite(start) || start <= 0) return "--:--:--";
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - start) / 1000));
  // Cap at 99h:59m:59s to surface stale timers visually
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
  // Older than 24h = stale (likely forgotten)
  return Date.now() - start > 24 * 3600 * 1000;
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
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(initialTimer);
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);

  // New timer form state
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [description, setDescription] = useState("");

  // Filtered projects based on selected client
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (selectedClientId) {
      // Find projects linked to this client via the tasks' project relations
      setFilteredProjects(allProjects);
      setSelectedProjectId("");
    } else {
      setFilteredProjects([]);
    }
  }, [selectedClientId, allProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      setFilteredTasks(allTasks);
      setSelectedTaskId("");
    } else {
      setFilteredTasks([]);
    }
  }, [selectedProjectId, allTasks]);

  // Tick every second for active timer
  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setElapsed(formatElapsed(activeTimer.startTime));
    }, 1000);
    setElapsed(formatElapsed(activeTimer.startTime));
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStart = useCallback(async () => {
    if (!selectedClientId || !selectedProjectId) {
      toast.error("Select a client and project");
      return;
    }
    setLoading(true);
    try {
      const entry = await startTimer({
        workspaceId,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        taskId: selectedTaskId || undefined,
        description: description || undefined,
      });

      const client = clients.find((c) => c.id === selectedClientId);
      const project = allProjects.find((p) => p.id === selectedProjectId);
      const task = allTasks.find((t) => t.id === selectedTaskId);

      setActiveTimer({
        id: entry.id,
        clientId: selectedClientId,
        projectId: selectedProjectId,
        taskId: selectedTaskId || null,
        description: description || null,
        startTime: entry.startTime!,
        clientName: client?.name ?? null,
        projectName: project?.name ?? null,
        taskTitle: task?.title ?? null,
      });

      toast.success("Timer started");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to start timer");
    } finally {
      setLoading(false);
    }
  }, [selectedClientId, selectedProjectId, selectedTaskId, description, workspaceId, clients, allProjects, allTasks, router]);

  const handleStop = useCallback(async () => {
    if (!activeTimer) return;
    setLoading(true);
    try {
      await stopTimer(activeTimer.id);
      setActiveTimer(null);
      setElapsed("00:00:00");
      toast.success("Timer stopped");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to stop timer");
    } finally {
      setLoading(false);
    }
  }, [activeTimer, router]);

  const handleDiscard = useCallback(async () => {
    if (!activeTimer) return;
    setLoading(true);
    try {
      // stopTimer is defensive: deletes entries with null startTime
      await stopTimer(activeTimer.id);
      setActiveTimer(null);
      setElapsed("00:00:00");
      toast.success("Stale timer discarded");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to discard timer");
    } finally {
      setLoading(false);
    }
  }, [activeTimer, router]);

  return (
    <Card>
      <CardContent className="p-6">
        {activeTimer ? (
          /* Active timer display */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${isStaleTimer(activeTimer) ? "bg-amber-500" : "bg-red-500 animate-pulse"}`} />
                <span className={`text-sm font-medium ${isStaleTimer(activeTimer) ? "text-amber-700" : "text-red-600"}`}>
                  {isStaleTimer(activeTimer) ? "Stale (24h+)" : "Recording"}
                </span>
              </div>
              <span className="text-3xl font-mono font-bold tabular-nums">{elapsed}</span>
            </div>
            {isStaleTimer(activeTimer) && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                This timer has been running for over 24 hours. Stop and restart, or discard if it was left on by accident.
              </div>
            )}
            <div className="text-sm text-muted-foreground space-y-0.5">
              {activeTimer.clientName && <p>Client: {activeTimer.clientName}</p>}
              {activeTimer.projectName && <p>Project: {activeTimer.projectName}</p>}
              {activeTimer.taskTitle && <p>Task: {activeTimer.taskTitle}</p>}
              {activeTimer.description && <p>Note: {activeTimer.description}</p>}
            </div>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="lg"
                className="flex-1 gap-2"
                onClick={handleStop}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop Timer
              </Button>
              {isStaleTimer(activeTimer) && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleDiscard}
                  disabled={loading}
                  title="Discard this stale timer without saving"
                >
                  Discard
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* New timer form */
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Start Timer</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Client *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Project *</Label>
                <Select
                  value={selectedProjectId}
                  onValueChange={setSelectedProjectId}
                  disabled={!selectedClientId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Task (optional)</Label>
                <Select
                  value={selectedTaskId}
                  onValueChange={setSelectedTaskId}
                  disabled={!selectedProjectId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {filteredTasks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What are you working on?"
                className="h-9"
              />
            </div>

            <Button
              className="w-full gap-2"
              onClick={handleStart}
              disabled={loading || !selectedClientId || !selectedProjectId}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Timer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
