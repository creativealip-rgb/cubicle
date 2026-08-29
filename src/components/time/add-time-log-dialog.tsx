"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Plus, Loader2, Briefcase, CheckSquare, Tag as TagIcon, Clock, Calendar as CalendarIcon, Hourglass } from "lucide-react";
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
  const [timeFormatted, setTimeFormatted] = useState("00:00:00");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [tags, setTags] = useState("");
  const [billable, setBillable] = useState(true);

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

  // Calculate duration in minutes from HH:MM:SS format
  const durationMinutes = useMemo(() => {
    const parts = timeFormatted.split(":").map((p) => parseInt(p, 10) || 0);
    const hrs = parts[0] || 0;
    const mins = parts[1] || 0;
    const secs = parts[2] || 0;
    return Math.max(0, hrs * 60 + mins + Math.round(secs / 60));
  }, [timeFormatted]);

  const clientError = submitted && !clientId;
  const projectError = submitted && !projectId;
  const taskError = submitted && taskRequired && taskId === "__none__";
  const minutesError = submitted && durationMinutes < 1;

  function reset() {
    setSubmitted(false);
    setDescription("");
    setClientId("");
    setProjectId("");
    setTaskId("__none__");
    setProjectSearch("");
    setProjectSearchOpen(false);
    setTaskSearch("");
    setTaskSearchOpen(false);
    setDate(localDateIso(new Date()));
    setTimeFormatted("00:00:00");
    setStartTime("");
    setEndTime("");
    setTags("");
    setBillable(true);
  }

  function handleTimeChange(val: string) {
    setTimeFormatted(val);
  }

  // Handle start / end time auto-calculation
  function handleStartEndChange(newStart?: string, newEnd?: string) {
    const s = newStart !== undefined ? newStart : startTime;
    const e = newEnd !== undefined ? newEnd : endTime;
    if (s && e) {
      const [sH, sM] = s.split(":").map(Number);
      const [eH, eM] = e.split(":").map(Number);
      if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
        let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
        if (diffMins < 0) diffMins += 24 * 60; // next day wrap
        const h = Math.floor(diffMins / 60);
        const m = diffMins % 60;
        setTimeFormatted(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
      }
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!clientId || !projectId || (taskRequired && taskId === "__none__") || durationMinutes < 1) return;
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
        durationMinutes,
        billable,
        status: "approved",
      });
      setOpen(false);
      reset();
      toast.success(t("Waktu tercatat", "Time logged"));
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal mencatat waktu", "Failed to log time"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next && !loading) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-11 w-full gap-1 sm:h-8 sm:w-auto">
          <Plus className="h-4 w-4" />
          {t("Catat Waktu", "Log Time")}
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(90dvh,760px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
          <DialogTitle>{t("Tambah Log Waktu", "Add time log")}</DialogTitle>
        </DialogHeader>

        <form id="create-time-entry-form" onSubmit={submit} className="grid min-h-0 grid-cols-1 gap-6 overflow-y-auto px-5 py-5 md:grid-cols-12">
          {/* Left Column - Track on */}
          <div className="space-y-4 md:col-span-7">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Lacak Pada", "Track on")}</Label>
            </div>

            {/* Client & Project Input */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Klien & Proyek *", "Client & Project *")}</Label>
              <div className="relative">
                <div className="relative flex items-center">
                  <Briefcase className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="manual-time-project"
                    aria-label={t("Cari klien atau proyek...", "Search client or project...")}
                    placeholder={t("Pilih/buat proyek...", "Select/create a project...")}
                    value={projectSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProjectSearch(val);
                      setProjectSearchOpen(true);
                    }}
                    onFocus={() => {
                      const currentClientName = clients.find((c) => c.id === clientId)?.name || "";
                      const currentProjectName = projects.find((p) => p.id === projectId)?.name || "";
                      const selectedLabel = currentClientName && currentProjectName ? `${currentClientName} — ${currentProjectName}` : currentProjectName || currentClientName;
                      if (projectSearch.trim() !== selectedLabel.trim()) {
                        setProjectSearchOpen(true);
                      }
                    }}
                    className={`h-10 pl-9 text-sm ${clientError || projectError ? "border-destructive" : ""}`}
                  />
                </div>
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

            {/* Task Input */}
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Tugas (Opsional)", "Task (Optional)")}</Label>
              <div className="relative">
                <div className="relative flex items-center">
                  <CheckSquare className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="manual-time-task"
                    aria-label={projectId ? t("Cari tugas...", "Search task...") : t("Pilih klien & proyek dulu", "Select client & project first")}
                    placeholder={projectId ? t("Pilih/buat tugas...", "Select/create a task...") : t("Pilih klien & proyek dulu", "Select client & project first")}
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
                    className={`h-10 pl-9 text-sm ${taskError ? "border-destructive" : ""}`}
                  />
                </div>
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

            {/* Description Input */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-time-description" className="text-xs">{t("Deskripsi", "Description")}</Label>
              <Textarea
                id="manual-time-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("Tambah deskripsi log...", "Add log description...")}
                rows={4}
                className="min-h-[100px] text-sm"
              />
            </div>

            {/* Tag Input */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-time-tags" className="text-xs">{t("Tag", "Tag")}</Label>
              <div className="relative flex items-center">
                <TagIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="manual-time-tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder={t("Tambah tag...", "Add a tag...")}
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Duration */}
          <div className="space-y-4 border-t pt-4 md:col-span-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Durasi & Waktu", "Duration")}</Label>
            </div>

            {/* Format hh:mm:ss Duration */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-time-duration" className="text-xs">{t("Durasi (HH:MM:SS)", "Duration (hh:mm:ss)")}</Label>
              <div className="relative flex items-center">
                <Hourglass className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                 id="manual-time-duration"
                 type="text"
                  placeholder="00:00:00"
                  value={timeFormatted}
                  onChange={(e) => handleTimeChange(e.target.value)}
                  className={`h-10 pl-9 font-mono text-sm ${minutesError ? "border-destructive" : ""}`}
                />
              </div>
              {minutesError ? <p className="text-xs text-destructive">{t("Durasi minimal 1 menit", "Duration minimum 1 minute")}</p> : null}
            </div>

            {/* Split row: Start time & End time */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Jam Mulai", "Start time")}</Label>
                <div className="relative flex items-center">
                  <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(e.target.value);
                      handleStartEndChange(e.target.value, undefined);
                    }}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Jam Selesai", "End time")}</Label>
                <div className="relative flex items-center">
                  <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(e.target.value);
                      handleStartEndChange(undefined, e.target.value);
                    }}
                    className="h-9 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-1.5">
              <Label htmlFor="manual-time-date" className="text-xs">{t("Tanggal", "Date")}</Label>
              <div className="relative flex items-center">
                <CalendarIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="manual-time-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-10 pl-9 text-sm"
                />
              </div>
            </div>

            {/* Billable Select */}
            <div className="space-y-1.5 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">{t("Tagihan / Billable", "Billable")}</Label>
                <Select value={billable ? "yes" : "no"} onValueChange={(value) => setBillable(value === "yes")}>
                  <SelectTrigger className="h-8 w-32 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t("Bisa Ditagih", "Billable")}</SelectItem>
                    <SelectItem value="no">{t("Tidak Ditagih", "Not billable")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="shrink-0 gap-2 border-t bg-background px-5 py-4 sm:gap-3">
          <Button className="min-h-10 sm:min-w-24" type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            {t("Batal", "Dismiss")}
          </Button>
          <Button className="min-h-10 sm:min-w-28" type="submit" form="create-time-entry-form" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("+ Tambah Log Waktu", "+ Add time log")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
