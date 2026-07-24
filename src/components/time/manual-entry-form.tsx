"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createManualEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId?: string;
  billingType?: string;
  rate?: string | null;
}

interface Task {
  id: string;
  title: string;
  projectId?: string;
}

interface ManualEntryFormProps {
  workspaceId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
}

function localDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ManualEntryForm({ workspaceId, clients, projects, tasks }: ManualEntryFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
  const [descriptionFromTask, setDescriptionFromTask] = useState(false);
  const [tags, setTags] = useState("");
  const [date, setDate] = useState(localDateValue);
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("0");
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState("");

  // Cascade: client → projects belonging to that client; project → tasks of that project.
  // No fallback to "all" — empty means pick parent first.
  const filteredProjects = useMemo(() => {
    if (!clientId) return [];
    return projects.filter((p) => p.clientId === clientId);
  }, [clientId, projects]);

  const filteredTasks = useMemo(() => {
    if (!projectId) return [];
    return tasks.filter((tk) => tk.projectId === projectId);
  }, [projectId, tasks]);

  // Rate input only makes sense for hourly-billed projects; otherwise the
  // backend inherits the project rate and the manual field is just noise.
  const selectedProject = projects.find((p) => p.id === projectId);
  const isHourly = selectedProject?.billingType === "hours";

  function handleClientChange(value: string) {
    setClientId(value);
    setProjectId("");
    setTaskId("");
    setHourlyRate("");
    if (descriptionFromTask) {
      setDescription("");
      setDescriptionFromTask(false);
    }
  }

  function handleProjectChange(value: string) {
    setProjectId(value);
    setTaskId("");
    setHourlyRate("");
    if (descriptionFromTask) {
      setDescription("");
      setDescriptionFromTask(false);
    }
  }

  function handleTaskChange(value: string) {
    const next = value === "__none__" ? "" : value;
    setTaskId(next);
    if (!next) {
      if (descriptionFromTask) {
        setDescription("");
        setDescriptionFromTask(false);
      }
      return;
    }
    const task = tasks.find((tk) => tk.id === next);
    if (!task?.title) return;
    if (!description.trim() || descriptionFromTask) {
      setDescription(task.title);
      setDescriptionFromTask(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !projectId) {
      toast.error(t("Klien dan proyek wajib diisi", "Client and project required"));
      return;
    }
    const durationMinutes = parseInt(hours || "0") * 60 + parseInt(minutes || "0");
    if (durationMinutes <= 0) {
      toast.error(t("Durasi harus lebih dari 0", "Duration must be greater than 0"));
      return;
    }
    setLoading(true);
    try {
      await createManualEntry({
        workspaceId,
        clientId,
        projectId,
        taskId: taskId || undefined,
        description: description || undefined,
        tags: tags || undefined,
        date,
        durationMinutes,
        billable,
        hourlyRate: billable && hourlyRate ? Number(hourlyRate) : undefined,
      });
      toast.success(t("Entri waktu ditambahkan", "Time entry added"));
      setOpen(false);
      setClientId("");
      setProjectId("");
      setTaskId("");
      setDescription("");
      setDescriptionFromTask(false);
      setTags("");
      setDate(localDateValue());
      setHours("0");
      setMinutes("0");
      setBillable(true);
      setHourlyRate("");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menambah entri", "Failed to add entry"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-3 w-3" /> Entri Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,720px)] flex-col overflow-hidden p-0 sm:max-w-[560px]">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle>Tambah Entri Waktu Manual</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="min-h-0 space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Klien *</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Pilih klien" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Proyek *</Label>
              <Select value={projectId} onValueChange={handleProjectChange} disabled={!clientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={clientId ? "Pilih proyek" : "Pilih klien dulu"} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {clientId ? "Tidak ada proyek" : "Pilih klien dulu"}
                    </SelectItem>
                  ) : (
                    filteredProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Tugas (opsional)</Label>
            <Select
              value={taskId || "__none__"}
              onValueChange={handleTaskChange}
              disabled={!projectId}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={projectId ? "Pilih tugas" : "Pilih proyek dulu"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Tidak ada</SelectItem>
                {filteredTasks.map((tk) => (
                  <SelectItem key={tk.id} value={tk.id}>{tk.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Deskripsi</Label>
            <Input
              value={description}
              onChange={(e) => {
                setDescriptionFromTask(false);
                setDescription(e.target.value);
              }}
              placeholder="Ngerjain apa aja?"
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              {t(
                "Pilih task → deskripsi auto-map dari judul (bisa diedit).",
                "Pick a task → description auto-maps from title (editable).",
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">
              {t("Tag (opsional)", "Tags (optional)")}
            </Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder={t("Riset, Cold Calling, Follow Up", "Research, Cold Calling, Follow Up")}
              className="h-9"
            />
            <div className="flex flex-wrap gap-1.5">
              {[
                "Research",
                "Cold Calling",
                "Follow Up - Phone",
                "Follow Up - Text",
                "Task Reporting",
              ].map((preset) => (
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
            <p className="text-[11px] text-muted-foreground">
              {t(
                "Opsional. Pisahkan dengan koma. Dipakai filter timesheet.",
                "Optional. Comma-separated. Used in timesheet filters.",
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Tanggal *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="h-9"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Jam</Label>
              <Input
                type="number"
                min="0"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Menit</Label>
              <Input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
            <div className="flex items-center gap-2 pb-2">
              <input
                type="checkbox"
                id="billable"
                checked={billable}
                onChange={(e) => setBillable(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="billable" className="text-sm">Bisa Ditagih</Label>
            </div>
            {billable && isHourly && (
              <div className="space-y-2">
                <Label className="text-xs">{t("Tarif per jam", "Hourly rate")}</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder={selectedProject?.rate ? String(selectedProject.rate) : t("mis. 150000", "e.g. 150000")}
                  className="h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  {t("Kosongkan untuk pakai tarif proyek.", "Leave empty to use the project rate.")}
                </p>
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Tambah Entri
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
