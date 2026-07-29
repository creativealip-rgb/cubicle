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

interface Activity {
  id: string;
  name: string;
  projectId?: string;
}

interface ManualEntryFormProps {
  workspaceId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
  activities?: Activity[];
}

function localDateValue(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function ManualEntryForm({ workspaceId, clients, projects, tasks, activities = [] }: ManualEntryFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [activityId, setActivityId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [description, setDescription] = useState("");
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

  const filteredActivities = useMemo(() => {
    if (!projectId) return [];
    return activities.filter((a) => a.projectId === projectId);
  }, [projectId, activities]);

  // Rate input only makes sense for hourly-billed projects; otherwise the
  // backend inherits the project rate and the manual field is just noise.
  const selectedProject = projects.find((p) => p.id === projectId);
  const isHourly = selectedProject?.billingType === "hours";

  function handleClientChange(value: string) {
    setClientId(value);
    setProjectId("");
    setActivityId("");
    setTaskId("");
    setHourlyRate("");
  }

  function handleProjectChange(value: string) {
    setProjectId(value);
    setActivityId("");
    setTaskId("");
    setHourlyRate("");
  }

  function handleTaskChange(value: string) {
    setTaskId(value === "__none__" ? "" : value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId || !projectId || !taskId || !description.trim()) {
      toast.error(t("Klien, proyek, task, dan deskripsi wajib diisi", "Client, project, task, and description required"));
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
        activityId: activityId || null,
        taskId,
        description: description.trim(),
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
      setActivityId("");
      setTaskId("");
      setDescription("");
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
              <Label className="text-xs">{t("Klien", "Client")} *</Label>
              <Select value={clientId} onValueChange={handleClientChange}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("Pilih klien", "Select client")} />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">{t("Proyek", "Project")} *</Label>
              <Select value={projectId} onValueChange={handleProjectChange} disabled={!clientId}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={clientId ? t("Pilih proyek", "Select project") : t("Pilih klien dulu", "Select client first")} />
                </SelectTrigger>
                <SelectContent>
                  {filteredProjects.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      {clientId ? t("Tidak ada proyek", "No projects") : t("Pilih klien dulu", "Select client first")}
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
            <Label className="text-xs">{t("Aktivitas", "Activity")}</Label>
            <Select
              value={activityId || "__none__"}
              onValueChange={(value) => setActivityId(value === "__none__" ? "" : value)}
              disabled={!projectId}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={projectId ? t("Pilih activity", "Select activity") : t("Pilih proyek dulu", "Select project first")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                {filteredActivities.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Tugas terkait", "Related Task")}</Label>
            <Select
              value={taskId || "__none__"}
              onValueChange={handleTaskChange}
              disabled={!projectId}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder={projectId ? t("Pilih tugas", "Select task") : t("Pilih proyek dulu", "Select project first")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                {filteredTasks.map((tk) => (
                  <SelectItem key={tk.id} value={tk.id}>{tk.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ngerjain apa aja?"
              className="h-9"
            />
            <p className="text-[11px] text-muted-foreground">
              {t(
                "Task sebagai konteks; deskripsi pekerjaan tetap terpisah",
                "Task is context; work description stays separate",
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
