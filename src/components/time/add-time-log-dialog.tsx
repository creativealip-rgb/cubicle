"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createManualEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localDateIso } from "@/lib/effective-work-date";
import { useT } from "@/lib/i18n-client";

type Client = { id: string; name: string };
type Project = { id: string; name: string; customerRef: string | null; billingType?: string | null; rate?: string | null };
type Task = { id: string; title: string; projectRef: string | null };

export function AddTimeLogDialog({ workspaceId, clients, projects, tasks }: {
  workspaceId: string;
  clients: Client[];
  projects: Project[];
  tasks: Task[];
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [taskId, setTaskId] = useState("__none__");
  const [date, setDate] = useState(() => localDateIso(new Date()));
  const [durationMinutes, setDurationMinutes] = useState("0");
  const [tags, setTags] = useState("");
  const [billable, setBillable] = useState(false);
  const [status, setStatus] = useState<"draft" | "approved">("draft");

  const clientProjects = useMemo(() => projects.filter((project) => project.customerRef === clientId), [clientId, projects]);
  const projectTasks = useMemo(() => tasks.filter((task) => task.projectRef === projectId), [projectId, tasks]);
  const project = projects.find((item) => item.id === projectId);
  const taskRequired = project?.billingType === "hours" || project?.billingType === "hourly" || project?.billingType === "retainer";
  const minutes = Number(durationMinutes || 0);
  const clientError = submitted && !clientId;
  const projectError = submitted && !projectId;
  const taskError = submitted && taskRequired && taskId === "__none__";
  const minutesError = submitted && minutes < 1;

  function reset() {
    setSubmitted(false); setDescription(""); setClientId(""); setProjectId(""); setTaskId("__none__");
    setDate(localDateIso(new Date())); setDurationMinutes("0"); setTags(""); setBillable(false); setStatus("draft");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!clientId || !projectId || (taskRequired && taskId === "__none__") || minutes < 1) return;
    setLoading(true);
    try {
      await createManualEntry({
        workspaceId,
        clientId,
        projectId,
        taskId: taskId === "__none__" ? "" : taskId,
        description: description.trim() || t("Catatan waktu manual", "Manual time entry"),
        tags: tags.trim() || undefined,
        date,
        durationMinutes: minutes,
        billable,
        status,
      });
      setOpen(false);
      reset();
      toast.success(t("Waktu tercatat", "Time logged"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal mencatat waktu", "Failed to log time"));
    } finally { setLoading(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !loading) reset(); }}>
    <DialogTrigger asChild><Button className="h-11 w-full gap-2 sm:h-9 sm:w-auto"><Plus className="h-4 w-4" />{t("Catat Waktu", "Log Time")}</Button></DialogTrigger>
    <DialogContent className="flex max-h-[min(90dvh,760px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12"><DialogTitle>{t("Catat Waktu", "Log Time")}</DialogTitle></DialogHeader>
      <form id="create-time-entry-form" onSubmit={submit} className="grid min-h-0 gap-4 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="manual-time-client" className="text-xs">{t("Klien", "Client")}</Label>
            <Select value={clientId} onValueChange={(value) => { setClientId(value); setProjectId(""); setTaskId("__none__"); }}>
              <SelectTrigger id="manual-time-client" className={`h-10 text-sm ${clientError ? "border-destructive" : ""}`}><SelectValue placeholder={t("Pilih klien", "Select client")} /></SelectTrigger>
              <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>)}</SelectContent>
            </Select>
            {clientError ? <p className="text-xs text-destructive">{t("Klien wajib dipilih", "Client is required")}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="manual-time-project" className="text-xs">{t("Project", "Project")}</Label>
            <Select value={projectId} onValueChange={(value) => { setProjectId(value); setTaskId("__none__"); }} disabled={!clientId}>
              <SelectTrigger id="manual-time-project" className={`h-10 text-sm ${projectError ? "border-destructive" : ""}`}><SelectValue placeholder={t("Pilih project", "Select project")} /></SelectTrigger>
              <SelectContent>{clientProjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent>
            </Select>
            {projectError ? <p className="text-xs text-destructive">{t("Project wajib dipilih", "Project is required")}</p> : null}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-time-task" className="text-xs">{t("Task", "Task")}</Label>
          <Select value={taskId} onValueChange={setTaskId} disabled={!projectId}>
            <SelectTrigger id="manual-time-task" className={`h-9 text-sm ${taskError ? "border-destructive" : ""}`}><SelectValue placeholder={t("Opsional", "Optional")} /></SelectTrigger>
            <SelectContent><SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>{projectTasks.map((task) => <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>)}</SelectContent>
          </Select>
          {taskError ? <p className="text-xs text-destructive">{t("Task wajib dipilih untuk project ini", "Task is required for this project")}</p> : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="manual-time-date" className="text-xs">{t("Tanggal", "Date")}</Label><Input id="manual-time-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label htmlFor="manual-time-duration" className="text-xs">{t("Durasi (menit)", "Duration (minutes)")}</Label><Input id="manual-time-duration" type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className={`h-10 ${minutesError ? "border-destructive" : ""}`} aria-invalid={minutesError} />{minutesError ? <p className="text-xs text-destructive">{t("Minimal 1 menit", "Minimum 1 minute")}</p> : null}</div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-time-description" className="text-xs">{t("Deskripsi", "Description")}</Label>
          <Input id="manual-time-description" value={description} onChange={(e) => setDescription(e.target.value)} className="h-9" />
          <p className="text-[11px] text-muted-foreground">{t("Task sebagai konteks; deskripsi pekerjaan tetap terpisah", "Task as context; work description stays separate")}</p>
        </div>
        <div className="space-y-1.5"><Label htmlFor="manual-time-tags" className="text-xs">{t("Tag", "Tag")}</Label><Input id="manual-time-tags" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Research, Follow Up" className="h-9" /></div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label className="text-xs">{t("Bisa ditagih", "Billable")}</Label><Select value={billable ? "yes" : "no"} onValueChange={(value) => setBillable(value === "yes")}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="yes">{t("Ya", "Yes")}</SelectItem><SelectItem value="no">{t("Tidak", "No")}</SelectItem></SelectContent></Select></div>
          <div className="space-y-1.5"><Label className="text-xs">Status</Label><Select value={status} onValueChange={(value) => setStatus(value as "draft" | "approved")}><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="draft">Draft</SelectItem><SelectItem value="approved">Approved</SelectItem></SelectContent></Select></div>
        </div>
      </form>
      <DialogFooter className="shrink-0 gap-2 border-t bg-background px-5 py-4 sm:gap-3">
        <Button className="min-h-11 sm:min-w-28" type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
        <Button className="min-h-11 sm:min-w-28" type="submit" form="create-time-entry-form" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
