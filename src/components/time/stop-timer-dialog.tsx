"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { stopTimer } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export type TimerFormClient = { id: string; name: string };
export type TimerFormProject = {
  id: string;
  name: string;
  clientId?: string | null;
  billingType?: string | null;
  rate?: string | null;
};
export type TimerFormTask = {
  id: string;
  title: string;
  projectId?: string | null;
};

export type StopTimerPrefill = {
  entryId: string;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  description?: string | null;
  tags?: string | null;
};

interface StopTimerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: StopTimerPrefill | null;
  clients: TimerFormClient[];
  projects: TimerFormProject[];
  tasks: TimerFormTask[];
  onStopped?: () => void;
}

export function StopTimerDialog({
  open,
  onOpenChange,
  prefill,
  clients,
  projects,
  tasks,
  onStopped,
}: StopTimerDialogProps) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");

  useEffect(() => {
    if (!open || !prefill) return;
    setClientId(prefill.clientId || "");
    setProjectId(prefill.projectId || "");
    setTaskId(prefill.taskId || "");
    setDescription(prefill.description || "");
    setTags(prefill.tags || "");
    setHourlyRate("");
  }, [open, prefill]);

  const filteredProjects = useMemo(() => {
    if (!clientId) return [];
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

  const filteredTasks = useMemo(() => {
    if (!projectId) return [];
    return tasks.filter((tk) => tk.projectId === projectId);
  }, [projectId, tasks]);

  const selectedProject = projects.find((p) => p.id === projectId);
  const isHourly = selectedProject?.billingType === "hours";

  function handleClientChange(value: string) {
    setClientId(value);
    setProjectId("");
    setTaskId("");
    setHourlyRate("");
  }

  function handleProjectChange(value: string) {
    setProjectId(value);
    setTaskId("");
    setHourlyRate("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prefill?.entryId) return;
    if (!clientId || !projectId || !taskId || !description.trim()) {
      toast.error(
        t(
          "Client, project, task, dan deskripsi wajib diisi",
          "Client, project, task, and description are required",
        ),
      );
      return;
    }
    setLoading(true);
    try {
      await stopTimer({
        entryId: prefill.entryId,
        clientId,
        projectId,
        taskId,
        description: description.trim(),
        tags: tags || null,
        hourlyRate: isHourly && hourlyRate ? Number(hourlyRate) : undefined,
      });
      toast.success(t("Timer dihentikan", "Timer stopped"));
      onOpenChange(false);
      onStopped?.();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : t("Gagal menghentikan timer", "Failed to stop timer"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t("Hentikan Timer", "Stop Timer")}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">{t("Klien", "Client")} *</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
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
            <div className="space-y-2">
              <Label className="text-xs">{t("Proyek", "Project")} *</Label>
              <Select value={projectId} onValueChange={handleProjectChange} disabled={!clientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue
                    placeholder={
                      clientId
                        ? t("Pilih proyek", "Select project")
                        : t("Pilih klien dulu", "Select client first")
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {clientId
                        ? t("Tidak ada proyek", "No projects")
                        : t("Pilih klien dulu", "Select client first")}
                    </SelectItem>
                  ) : (
                    filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Tugas", "Task")} *</Label>
            <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue
                  placeholder={
                    projectId
                      ? t("Pilih tugas", "Select task")
                      : t("Pilih proyek dulu", "Select project first")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredTasks.length === 0 ? (
                  <SelectItem value="__none__" disabled>
                    {projectId
                      ? t("Tidak ada tugas", "No tasks")
                      : t("Pilih proyek dulu", "Select project first")}
                  </SelectItem>
                ) : (
                  filteredTasks.map((tk) => (
                    <SelectItem key={tk.id} value={tk.id}>
                      {tk.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Deskripsi", "Description")} *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("Lagi ngerjain apa?", "What are you working on?")}
              className="h-9"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Tag (opsional)", "Tags (optional)")}</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("Riset, Follow Up", "Research, Follow Up")}
              className="h-9"
            />
          </div>

          {isHourly && (
            <div className="space-y-2">
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

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button type="submit" disabled={loading || !clientId || !projectId || !taskId || !description.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan & Hentikan", "Save & Stop")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
