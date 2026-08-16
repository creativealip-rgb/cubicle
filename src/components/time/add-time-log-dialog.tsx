"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createManualEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  const { refresh } = useAppTransition();
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

  const [projectSearch, setProjectSearch] = useState("");
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [taskSearchOpen, setTaskSearchOpen] = useState(false);

  const allProjectOptions = useMemo(() => {
    return projects.map((p) => {
      const client = clients.find((c) => c.id === p.customerRef);
      return {
        projectId: p.id,
        projectName: p.name,
        clientId: p.customerRef || "",
        clientName: client?.name || t("Tanpa Klien", "No Client"),
      };
    });
  }, [projects, clients, t]);

  const filteredProjectOptions = useMemo(() => {
    const term = projectSearch.toLowerCase().trim();
    if (!term) return allProjectOptions;
    return allProjectOptions.filter(
      (opt) => opt.projectName.toLowerCase().includes(term) || opt.clientName.toLowerCase().includes(term),
    );
  }, [allProjectOptions, projectSearch]);

  const projectTasks = useMemo(() => tasks.filter((task) => task.projectRef === projectId), [projectId, tasks]);

  const filteredTaskOptions = useMemo(() => {
    const term = taskSearch.toLowerCase().trim();
    if (!term) return projectTasks;
    return projectTasks.filter((tk) => tk.title.toLowerCase().includes(term));
  }, [projectTasks, taskSearch]);
  const project = projects.find((item) => item.id === projectId);
  const taskRequired = project?.billingType === "hours" || project?.billingType === "hourly" || project?.billingType === "retainer";
  const minutes = Number(durationMinutes || 0);
  const clientError = submitted && !clientId;
  const projectError = submitted && !projectId;
  const taskError = submitted && taskRequired && taskId === "__none__";
  const minutesError = submitted && minutes < 1;

  function reset() {
    setSubmitted(false); setDescription(""); setClientId(""); setProjectId(""); setTaskId("__none__");
    setProjectSearch(""); setProjectSearchOpen(false); setTaskSearch(""); setTaskSearchOpen(false);
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
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal mencatat waktu", "Failed to log time"));
    } finally { setLoading(false); }
  }

  return <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !loading) reset(); }}>
    <DialogTrigger asChild><Button className="h-11 w-full gap-1 sm:h-8 sm:w-auto"><Plus className="h-4 w-4" />{t("Catat Waktu", "Log Time")}</Button></DialogTrigger>
    <DialogContent className="flex max-h-[min(90dvh,760px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
      <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12"><DialogTitle>{t("Catat Waktu", "Log Time")}</DialogTitle></DialogHeader>
      <form id="create-time-entry-form" onSubmit={submit} className="grid min-h-0 gap-4 overflow-y-auto px-5 py-5">
        <div className="space-y-1.5">
          <Label className="text-xs">{t("Klien & Proyek *", "Client & Project *")}</Label>
          <div className="relative">
            <Input
              id="manual-time-project"
              aria-label={t("Cari klien atau proyek...", "Search client or project...")}
              placeholder={t("Cari klien atau proyek...", "Search client or project...")}
              value={projectSearch}
              onChange={(e) => {
                const val = e.target.value;
                setProjectSearch(val);
                setProjectSearchOpen(Boolean(val.trim()));
              }}
              onFocus={() => {
                if (projectSearch.trim()) setProjectSearchOpen(true);
              }}
              className={`h-10 text-sm ${clientError || projectError ? "border-destructive" : ""}`}
            />
            {projectSearchOpen && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredProjectOptions.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">{t("Klien atau proyek tidak ditemukan", "No client or project found")}</p>
                ) : (
                  filteredProjectOptions.map((opt) => (
                    <button
                      key={opt.projectId}
                      type="button"
                      className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${projectId === opt.projectId ? "bg-accent font-medium" : ""}`}
                      onClick={() => {
                        setClientId(opt.clientId);
                        setProjectId(opt.projectId);
                        setProjectSearch(`${opt.clientName} — ${opt.projectName}`);
                        setProjectSearchOpen(false);
                        setTaskId("__none__");
                        setTaskSearch("");
                      }}
                    >
                      <span>{opt.projectName}</span>
                      <span className="text-[10px] text-muted-foreground">{opt.clientName}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {clientError || projectError ? <p className="text-xs text-destructive">{t("Klien & Proyek wajib dipilih", "Client & Project is required")}</p> : null}
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{t("Tugas (Opsional)", "Task (Optional)")}</Label>
          <div className="relative">
            <Input
              id="manual-time-task"
              aria-label={projectId ? t("Cari tugas...", "Search task...") : t("Pilih klien & proyek dulu", "Select client & project first")}
              placeholder={projectId ? t("Cari tugas...", "Search task...") : t("Pilih klien & proyek dulu", "Select client & project first")}
              value={taskSearch}
              disabled={!projectId}
              onChange={(e) => {
                const val = e.target.value;
                setTaskSearch(val);
                setTaskSearchOpen(Boolean(val.trim()));
              }}
              onFocus={() => {
                if (taskSearch.trim() && projectId) setTaskSearchOpen(true);
              }}
              className={`h-10 text-sm ${taskError ? "border-destructive" : ""}`}
            />
            {taskSearchOpen && projectId && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                <button
                  type="button"
                  className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${taskId === "__none__" ? "bg-accent font-medium" : ""}`}
                  onClick={() => {
                    setTaskId("__none__");
                    setTaskSearch("");
                    setTaskSearchOpen(false);
                  }}
                >
                  {t("Tidak ada", "None")}
                </button>
                {filteredTaskOptions.length === 0 ? (
                  <p className="p-2 text-xs text-muted-foreground">{t("Tugas tidak ditemukan", "No task found")}</p>
                ) : (
                  filteredTaskOptions.map((tk) => (
                    <button
                      key={tk.id}
                      type="button"
                      className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${taskId === tk.id ? "bg-accent font-medium" : ""}`}
                      onClick={() => {
                        setTaskId(tk.id);
                        setTaskSearch(tk.title);
                        setTaskSearchOpen(false);
                      }}
                    >
                      {tk.title}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {taskError ? <p className="text-xs text-destructive">{t("Tugas wajib dipilih untuk proyek ini", "Task is required for this project")}</p> : null}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="manual-time-date" className="text-xs">{t("Tanggal", "Date")}</Label><Input id="manual-time-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label htmlFor="manual-time-duration" className="text-xs">{t("Durasi (menit)", "Duration (minutes)")}</Label><Input id="manual-time-duration" type="number" min="1" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} className={`h-10 ${minutesError ? "border-destructive" : ""}`} aria-invalid={minutesError} />{minutesError ? <p className="text-xs text-destructive">{t("Minimal 1 menit", "Minimum 1 minute")}</p> : null}</div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-time-description" className="text-xs">{t("Deskripsi", "Description")}</Label>
          <Textarea id="manual-time-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="min-h-[80px]" />
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
