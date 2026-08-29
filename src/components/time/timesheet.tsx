"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { effectiveWorkDate } from "@/lib/effective-work-date";
import { deleteTimeEntry, updateTimeEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";
import {
  Briefcase,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Filter,
  Loader2,
  Tag as TagIcon,
  Calendar as CalendarIcon,
  Hourglass,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { allowsTimeTrackingProject } from "@/lib/billing-model";

const PAGE_SIZE = 10;

interface TimeEntry {
  id: string;
  description: string | null;
  tags: string | null;
  durationMinutes: number | null;
  manualMinutes?: number | null;
  billable: boolean;
  hourlyRate: string | number | null;
  workDate?: string | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  status: string;
  clientId?: string | null;
  projectId?: string | null;
  activityId?: string | null;
  taskId?: string | null;
  clientName: string | null;
  projectName: string | null;
  activityName?: string | null;
  projectCurrency: string | null;
  projectTimeTrackingMode: "off" | "internal" | "billable" | null;
  billingType?: string | null;
  taskTitle: string | null;
  userName: string | null;
  createdAt: Date | string;
}

interface Client {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  clientId?: string | null;
  timeTrackingMode?: "off" | "internal" | "billable" | null;
  billingType?: string | null;
  billingModel?: string | null;
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
}

interface TimesheetProps {
  entries: TimeEntry[];
  clients: Client[];
  projects: Project[];
  tasks?: Task[];
  activities?: Activity[];
  compact?: boolean;
  dialogOnly?: boolean;
  initialEditEntry?: TimeEntry | null;
  onEditClose?: () => void;
}

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateKey(entry: TimeEntry): string {
  return effectiveWorkDate(entry);
}

export function Timesheet({ entries, clients, projects, tasks = [], activities: _activities = [], compact = false, dialogOnly = false, initialEditEntry, onEditClose }: TimesheetProps) {
  const { t } = useT();
  const { refresh } = useAppTransition();

  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(Boolean(initialEditEntry));
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(initialEditEntry ?? null);

  useEffect(() => {
    if (initialEditEntry) {
      openEdit(initialEditEntry);
    }
    // openEdit initializes edit state from the new prop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialEditEntry]);
  const [editLoading, setEditLoading] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editTaskId, setEditTaskId] = useState("__none__");
  const [editDate, setEditDate] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editBillable, setEditBillable] = useState(true);
  const [_editStatus, setEditStatus] = useState<"draft" | "approved">("approved");
  const [deleteEntry, setDeleteEntry] = useState<TimeEntry | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (clientFilter !== "all" && e.clientId !== clientFilter) return false;
      if (projectFilter !== "all" && e.projectId !== projectFilter) return false;
      if (billableFilter === "billable" && !e.billable) return false;
      if (billableFilter === "non-billable" && e.billable) return false;
      if (
        tagFilter !== "all" &&
        !String(e.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .includes(tagFilter)
      )
        return false;
      if (dateFrom) {
        const entryDate = localDateKey(e);
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = localDateKey(e);
        if (entryDate > dateTo) return false;
      }
      return true;
    });
  }, [entries, clientFilter, projectFilter, billableFilter, tagFilter, dateFrom, dateTo]);

  useEffect(() => {
    setPage(1);
  }, [clientFilter, projectFilter, billableFilter, tagFilter, dateFrom, dateTo, entries.length]);

  const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEntries = useMemo(
    () => filteredEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredEntries, safePage],
  );

  const totalMinutes = useMemo(
    () => filteredEntries.reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [filteredEntries],
  );

  const billableMinutes = useMemo(
    () =>
      filteredEntries
        .filter((e) => e.billable)
        .reduce((sum, e) => sum + (e.durationMinutes ?? 0), 0),
    [filteredEntries],
  );

  const [editProjectSearch, setEditProjectSearch] = useState("");
  const [editProjectSearchOpen, setEditProjectSearchOpen] = useState(false);
  const [editTaskSearch, setEditTaskSearch] = useState("");
  const [editTaskSearchOpen, setEditTaskSearchOpen] = useState(false);

  const allEditProjectOptions = useMemo(() => {
    const writableProjects = projects.filter(
      (p) => p.timeTrackingMode !== "off" && allowsTimeTrackingProject(p),
    );
    const options = writableProjects.map((p) => {
      const client = clients.find((c) => c.id === p.clientId);
      return {
        projectId: p.id,
        projectName: p.name,
        clientId: p.clientId || "",
        clientName: client?.name || t("Tanpa Klien", "No Client"),
      };
    });
    // Preserve existing history when parent options are absent from current list payload.
    for (const entry of entries) {
      if (!entry.projectId || options.some((option) => option.projectId === entry.projectId)) continue;
      options.push({
        projectId: entry.projectId,
        projectName: entry.projectName || entry.projectId,
        clientId: entry.clientId || "",
        clientName: entry.clientName || t("Tanpa Klien", "No Client"),
      });
    }
    return options;
  }, [projects, clients, entries, t]);

  const filteredEditProjectOptions = useMemo(() => {
    const term = editProjectSearch.toLowerCase().trim();
    if (!term) return allEditProjectOptions;
    const matches = allEditProjectOptions.filter(
      (opt) => opt.projectName.toLowerCase().includes(term) || opt.clientName.toLowerCase().includes(term) || `${opt.clientName} — ${opt.projectName}`.toLowerCase().includes(term),
    );
    return matches.length > 0 ? matches : allEditProjectOptions;
  }, [allEditProjectOptions, editProjectSearch]);

  const editTasks = useMemo(() => {
    if (!editProjectId) return [];
    return tasks.filter((tk) => tk.projectId === editProjectId);
  }, [editProjectId, tasks]);

  const filteredEditTaskOptions = useMemo(() => {
    const term = editTaskSearch.toLowerCase().trim();
    if (!term) return editTasks;
    return editTasks.filter((tk) => tk.title.toLowerCase().includes(term));
  }, [editTasks, editTaskSearch]);


  const filterProjects = useMemo(() => {
    if (clientFilter === "all") return projects;
    return projects.filter((project) => project.clientId === clientFilter);
  }, [clientFilter, projects]);

  const editMinutesNumber = Number(editMinutes);
  const editClientError = editOpen && !editClientId;
  const editProjectError = editOpen && !editProjectId;
  const editMinutesError = editOpen && (!Number.isFinite(editMinutesNumber) || editMinutesNumber <= 0);
  const selectedEditProject = projects.find((project) => project.id === editProjectId);
  const editTaskRequired = selectedEditProject?.billingType === "hours" || selectedEditProject?.billingType === "hourly" || selectedEditProject?.billingType === "retainer";
  const editTaskError = editOpen && Boolean(editTaskRequired && (!editTaskId || editTaskId === "__none__"));
  const editValid = !editClientError && !editProjectError && !editMinutesError && !editTaskError;

  function formatDuration(minutes: number | null): string {
    const hLabel = t("j", "h");
    const mLabel = t("mnt", "m");
    if (!minutes) return `0${mLabel}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}${mLabel}`;
    return `${h}${hLabel} ${m}${mLabel}`;
  }

  function _formatRate(rate: string | number | null, currency: string | null): string | null {
    if (rate === null || rate === "") return null;
    const numericRate = Number(rate);
    if (!Number.isFinite(numericRate) || numericRate <= 0) return null;
    const cur = (currency || "IDR").toUpperCase();
    const localeMap: Record<string, string> = { IDR: "id-ID", USD: "en-US", EUR: "de-DE" };
    return new Intl.NumberFormat(localeMap[cur] || "en-US", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "IDR" ? 0 : 2,
    }).format(numericRate);
  }

  async function handleDelete() {
    if (!deleteEntry) return;
    setDeleteLoading(true);
    try {
      const result = await deleteTimeEntry(deleteEntry.id);
      if (result && "success" in result && result.success === false) {
        toast.error(result.error);
        return;
      }
      toast.success(t("Entri dihapus", "Entry deleted"));
      setDeleteEntry(null);
      setEditEntry(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
    } finally {
      setDeleteLoading(false);
    }
  }

  function canEditEntry(entry: TimeEntry) {
    if (entry.status === "invoiced") return false;
    if (entry.projectTimeTrackingMode === "off") return false;
    // Historical Fixed Price / legacy Package entries are immutable (server
    // assertHistoricalTimeEntryMutable) — mirror the read-only gate in UI.
    const billingType = entry.billingType;
    if (billingType === "project" || billingType === "fixed_price" || billingType === "package") return false;
    return true;
  }

  function openEdit(entry: TimeEntry) {
    if (!canEditEntry(entry)) {
      toast.error(t("Entri hanya dapat dibaca", "Entry is read only"));
      return;
    }
    setEditEntry(entry);
    setEditDescription(entry.description || "");
    setEditTags(entry.tags || "");
    setEditClientId(entry.clientId || "");
    setEditProjectId(entry.projectId || "");
    setEditTaskId(entry.taskId || "__none__");

    const clientName = entry.clientName || clients.find((c) => c.id === entry.clientId)?.name || "";
    const projectName = entry.projectName || projects.find((p) => p.id === entry.projectId)?.name || "";
    setEditProjectSearch(clientName && projectName ? `${clientName} — ${projectName}` : projectName || clientName);
    setEditProjectSearchOpen(false);

    const taskTitle = entry.taskTitle || tasks.find((t) => t.id === entry.taskId)?.title || "";
    setEditTaskSearch(taskTitle);
    setEditTaskSearchOpen(false);
    
    // Set date from workDate or startTime
    const initialDate = entry.workDate ? String(entry.workDate).slice(0, 10) : toDateInputValue(entry.startTime);
    setEditDate(initialDate);

    const sTime = entry.startTime ? new Date(entry.startTime).toTimeString().slice(0, 5) : "";
    const eTime = entry.endTime ? new Date(entry.endTime).toTimeString().slice(0, 5) : "";
    setEditStartTime(sTime);
    setEditEndTime(eTime);

    setEditMinutes(String(entry.durationMinutes ?? entry.manualMinutes ?? 0));
    setEditBillable(entry.billable);
    setEditStatus("approved");
    setEditOpen(true);
  }

  function handleEditTaskChange(nextTaskId: string) {
    setEditTaskId(nextTaskId);
  }

  async function handleSaveEdit() {
    if (!editEntry) return;
    if (!editClientId || !editProjectId) {
      toast.error(t("Klien dan proyek wajib", "Client and project required"));
      return;
    }
    if (editTaskRequired && (!editTaskId || editTaskId === "__none__")) {
      toast.error(t("Task wajib dipilih untuk project Hourly/Retainer", "Task is required for Hourly/Retainer projects"));
      return;
    }
    const minutes = Number(editMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error(t("Durasi menit harus > 0", "Duration minutes must be > 0"));
      return;
    }

    setEditLoading(true);
    try {
      const startIso = editDate && editStartTime
        ? new Date(`${editDate}T${editStartTime}:00`).toISOString()
        : editDate
          ? new Date(`${editDate}T12:00:00`).toISOString()
          : editEntry.startTime
            ? new Date(editEntry.startTime).toISOString()
            : new Date().toISOString();
      const endIso = editDate && editEndTime
        ? new Date(`${editDate}T${editEndTime}:00`).toISOString()
        : new Date(new Date(startIso).getTime() + minutes * 60 * 1000).toISOString();

      await updateTimeEntry(editEntry.id, {
        description: editDescription || undefined,
        tags: editTags || null,
        clientId: editClientId,
        projectId: editProjectId,
        taskId: editTaskId && editTaskId !== "__none__" ? editTaskId : null,
        startTime: startIso,
        endTime: endIso,
        manualMinutes: editEntry.manualMinutes != null ? minutes : null,
        billable: editBillable,
        status: "approved",
      });

      toast.success(t("Entri diperbarui", "Entry updated"));
      setEditOpen(false);
      setEditEntry(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal update", "Failed to update"));
    } finally {
      setEditLoading(false);
    }
  }

  const uniqueTags = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((entry) => {
      String(entry.tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .forEach((tag) => set.add(tag));
    });
    return Array.from(set);
  }, [entries]);

  if (dialogOnly) {
    return (
      <>
        <Dialog open={editOpen} onOpenChange={(open) => {
          setEditOpen(open);
          if (!open && onEditClose) onEditClose();
        }}>
          <DialogContent className="flex max-h-[min(90dvh,760px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
            <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
              <DialogTitle>{t("Edit Log Waktu", "Edit time log")}</DialogTitle>
            </DialogHeader>

            <div className="grid min-h-0 grid-cols-1 gap-6 overflow-y-auto px-5 py-5 md:grid-cols-12">
              {/* Left Column - Track on */}
              <div className="space-y-4 md:col-span-7">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Lacak Pada", "Track on")}</Label>
                </div>

                {/* Client & Project */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Klien & Proyek *", "Client & Project *")}</Label>
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Briefcase className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("Cari klien atau proyek...", "Search client or project...")}
                        value={editProjectSearch}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditProjectSearch(val);
                          setEditProjectSearchOpen(true);
                        }}
                        onFocus={() => {
                          const currentClientName = clients.find((c) => c.id === editClientId)?.name || "";
                          const currentProjectName = projects.find((p) => p.id === editProjectId)?.name || "";
                          const selectedLabel = currentClientName && currentProjectName ? `${currentClientName} — ${currentProjectName}` : currentProjectName || currentClientName;
                          if (editProjectSearch.trim() !== selectedLabel.trim()) {
                            setEditProjectSearchOpen(true);
                          }
                        }}
                        className={`h-10 pl-9 text-sm ${editProjectError || editClientError ? "border-destructive" : ""}`}
                      />
                    </div>
                    {editProjectSearchOpen && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        {filteredEditProjectOptions.length === 0 ? (
                          <p className="p-2 text-xs text-muted-foreground">{t("Klien atau proyek tidak ditemukan", "No client or project found")}</p>
                        ) : (
                          filteredEditProjectOptions.map((opt) => (
                            <button
                              key={opt.projectId}
                              type="button"
                              className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editProjectId === opt.projectId ? "bg-accent font-medium" : ""}`}
                              onClick={() => {
                                setEditClientId(opt.clientId);
                                setEditProjectId(opt.projectId);
                                setEditProjectSearch(`${opt.clientName} — ${opt.projectName}`);
                                setEditProjectSearchOpen(false);
                                setEditTaskId("__none__");
                                setEditTaskSearch("");
                              }}
                            >
                              <span className="font-medium">{opt.clientName}</span>
                              <span className="text-muted-foreground">{opt.projectName}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Task */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tugas", "Task")}</Label>
                  <div className="relative">
                    <div className="relative flex items-center">
                      <CheckSquare className="absolute left-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={t("Cari atau pilih tugas...", "Search or select task...")}
                        value={editTaskSearch}
                        disabled={!editProjectId}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEditTaskSearch(val);
                          setEditTaskSearchOpen(true);
                        }}
                        onFocus={() => {
                          const currentTask = tasks.find((tk) => tk.id === editTaskId);
                          if (editProjectId && editTaskSearch.trim() !== currentTask?.title.trim()) {
                            setEditTaskSearchOpen(true);
                          }
                        }}
                        className="h-10 pl-9 text-sm"
                      />
                    </div>
                    {editTaskSearchOpen && editProjectId && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                        <button
                          type="button"
                          className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editTaskId === "__none__" ? "bg-accent font-medium" : ""}`}
                          onClick={() => {
                            setEditTaskId("__none__");
                            setEditTaskSearch("");
                            setEditTaskSearchOpen(false);
                          }}
                        >
                          <span className="italic text-muted-foreground">{t("Tanpa Tugas", "No Task")}</span>
                        </button>
                        {filteredEditTaskOptions.map((tk) => (
                          <button
                            key={tk.id}
                            type="button"
                            className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editTaskId === tk.id ? "bg-accent font-medium" : ""}`}
                            onClick={() => {
                              setEditTaskId(tk.id);
                              setEditTaskSearch(tk.title);
                              setEditTaskSearchOpen(false);
                            }}
                          >
                            <span>{tk.title}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
                  <Textarea
                    placeholder={t("Apa yang kamu kerjakan?", "What are you working on?")}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="min-h-[80px] text-xs resize-y"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tag", "Tags")}</Label>
                  <div className="relative flex items-center">
                    <TagIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("Pisahkan dengan koma (mis: dev, meeting)", "Separate with comma (e.g. dev, meeting)")}
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="h-10 pl-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Duration & Details */}
              <div className="space-y-4 md:col-span-5 md:border-l md:pl-6">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Waktu & Tanggal", "Time & Date")}</Label>
                </div>

                {/* Duration Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("Durasi (Jam:Menit:Detik) *", "Duration (HH:MM:SS) *")}</Label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="00:00:00"
                      value={editMinutes ? `${String(Math.floor(Number(editMinutes)/60)).padStart(2,'0')}:${String(Number(editMinutes)%60).padStart(2,'0')}:00` : "00:00:00"}
                      onChange={(e) => {
                        const parts = e.target.value.split(":").map((p) => parseInt(p, 10) || 0);
                        const hrs = parts[0] || 0;
                        const mins = parts[1] || 0;
                        const secs = parts[2] || 0;
                        setEditMinutes(String(Math.max(0, hrs * 60 + mins + Math.round(secs / 60))));
                      }}
                      className={`h-10 pl-9 font-mono text-sm ${editMinutesError ? "border-destructive" : ""}`}
                    />
                  </div>
                </div>

                {/* Time Range (Start/End) */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Waktu Mulai", "Start time")}</Label>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        value={editStartTime}
                        onChange={(e) => {
                          const newStart = e.target.value;
                          setEditStartTime(newStart);
                          if (newStart && editEndTime) {
                            const [sH, sM] = newStart.split(":").map(Number);
                            const [eH, eM] = editEndTime.split(":").map(Number);
                            if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                              let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
                              if (diffMins < 0) diffMins += 24 * 60;
                              setEditMinutes(String(diffMins));
                            }
                          }
                        }}
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">{t("Waktu Selesai", "End time")}</Label>
                    <div className="relative flex items-center">
                      <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        type="time"
                        value={editEndTime}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          setEditEndTime(newEnd);
                          if (editStartTime && newEnd) {
                            const [sH, sM] = editStartTime.split(":").map(Number);
                            const [eH, eM] = editStartTime.split(":").map(Number);
                            if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                              let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
                              if (diffMins < 0) diffMins += 24 * 60;
                              setEditMinutes(String(diffMins));
                            }
                          }
                        }}
                        className="h-9 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Tanggal", "Date")}</Label>
                  <div className="relative flex items-center">
                    <CalendarIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="h-10 pl-9 text-sm"
                    />
                  </div>
                </div>

                {/* Billable Select */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">{t("Tagihan / Billable", "Billable")}</Label>
                    <Select value={editBillable ? "yes" : "no"} onValueChange={(v) => setEditBillable(v === "yes")}>
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
            </div>

            <DialogFooter className="shrink-0 items-center justify-between gap-2 border-t bg-background px-5 py-4 sm:gap-3">
              <div>
                {editEntry && editEntry.status !== "invoiced" && (
                  <Button
                    variant="ghost"
                    type="button"
                    className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setDeleteEntry(editEntry)}
                    disabled={editLoading}
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    {t("Hapus log ini", "Delete this log")}
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <Button className="min-h-10 sm:min-w-24" variant="outline" onClick={() => {
                  setEditOpen(false);
                  if (onEditClose) onEditClose();
                }} disabled={editLoading}>
                  {t("Batal", "Dismiss")}
                </Button>
                <Button className="min-h-10 sm:min-w-28" onClick={handleSaveEdit} disabled={editLoading || !editValid}>
                  {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={Boolean(deleteEntry)} onOpenChange={(o) => !o && setDeleteEntry(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("Hapus Log Waktu?", "Delete Time Log?")}</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground">
              {t("Tindakan ini tidak dapat dibatalkan. Log waktu akan dihapus permanen.", "This action cannot be undone. The time log will be permanently removed.")}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setDeleteEntry(null)}>
                {t("Batal", "Cancel")}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={editLoading}>
                {t("Hapus", "Delete")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="space-y-4">
      {!compact && <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("Total Waktu", "Total Time")}</p>
            <p className="text-xl font-bold">{formatDuration(totalMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("Bisa Ditagih", "Billable")}</p>
            <p className="text-xl font-bold">{formatDuration(billableMinutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{t("Entri", "Entries")}</p>
            <p className="text-xl font-bold">{filteredEntries.length}</p>
          </CardContent>
        </Card>
      </div>}

      {!compact && <Card className="rounded-lg border bg-card">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t("Filter", "Filter")}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <div className="space-y-1">
              <Label className="text-[10px]">{t("Klien", "Client")}</Label>
              <Select value={clientFilter} onValueChange={(value) => {
                setClientFilter(value);
                setProjectFilter("all");
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("Semua", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua Klien", "All Clients")}</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{t("Proyek", "Project")}</Label>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("Semua", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua Proyek", "All Projects")}</SelectItem>
                  {filterProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">{t("Bisa Ditagih", "Billable")}</Label>
              <Select value={billableFilter} onValueChange={setBillableFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("Semua", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua", "All")}</SelectItem>
                  <SelectItem value="billable">{t("Bisa Ditagih", "Billable")}</SelectItem>
                  <SelectItem value="non-billable">{t("Tidak Ditagih", "Non-billable")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Tag</Label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("Semua", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua Tag", "All Tags")}</SelectItem>
                  {uniqueTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-2 sm:flex-row">
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-[10px]">{t("Dari", "From")}</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <Label className="text-[10px]">{t("Sampai", "To")}</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>}

      {filteredEntries.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t("Belum ada catatan waktu", "No time entries yet")}
          description={t(
            "Mulai timer di atas atau tambah entri manual untuk mulai melacak waktu kerjamu. Kalau sudah ada data, coba sesuaikan filter.",
            "Start the timer above or add a manual entry to begin tracking your work time. If you already have data, try adjusting the filters.",
          )}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              {t(
                `Menampilkan ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredEntries.length)} dari ${filteredEntries.length}`,
                `Showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, filteredEntries.length)} of ${filteredEntries.length}`,
              )}
              {" · "}
              {t(`max ${PAGE_SIZE}/halaman`, `max ${PAGE_SIZE}/page`)}
            </p>
            {totalPages > 1 ? (
              <p className="text-xs text-muted-foreground">
                {t("Halaman", "Page")} {safePage}/{totalPages}
              </p>
            ) : null}
          </div>

          {pageEntries.map((entry, index) => {
            const historyPrimaryTitle = [entry.projectName, entry.taskTitle].filter(Boolean).join(" · ") || t("Tanpa proyek / task", "No project / task");
            const historyDescription = entry.description?.trim();
            return (
            <Card key={entry.id} className="rounded-none border-0 shadow-none">
              <CardContent
                role={canEditEntry(entry) ? "button" : undefined}
                tabIndex={canEditEntry(entry) ? 0 : undefined}
                aria-label={canEditEntry(entry) ? t("Edit entri waktu", "Edit time entry") : undefined}
                onClick={() => canEditEntry(entry) && openEdit(entry)}
                onKeyDown={(event) => {
                  if (canEditEntry(entry) && (event.key === "Enter" || event.key === " ")) {
                    event.preventDefault();
                    openEdit(entry);
                  }
                }}
                className={`flex flex-col gap-3 !border-b border-slate-200 p-3 hover:!bg-slate-100/70 sm:flex-row sm:items-center sm:justify-between ${
                  index % 2 === 0 ? "!bg-white" : "!bg-slate-50"
                } ${canEditEntry(entry) ? "cursor-pointer outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset" : ""}`}
              >
                <div className="flex min-w-0 items-start gap-3 sm:items-center">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{historyPrimaryTitle}</p>
                    {historyDescription ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{historyDescription}</p> : null}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {entry.clientName && <span>{entry.clientName}</span>}
                      <span>·</span>
                      <span>{entry.userName || t("Tidak diketahui", "Unknown")}</span>
                      <span>·</span>
                      <span>
                        {effectiveWorkDate(entry)}
                      </span>
                    </div>
                    {entry.tags && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags
                          .split(",")
                          .map((tag) => tag.trim())
                          .filter(Boolean)
                          .map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-wrap items-center gap-1.5 pl-8 sm:w-auto sm:flex-shrink-0 sm:justify-end sm:pl-0">
                  <Badge variant="secondary" className="text-[10px]">
                    {formatDuration(entry.durationMinutes)}
                  </Badge>
                  {entry.projectTimeTrackingMode === "off" ? (
                    <Badge variant="outline" className="text-[10px]">
                      {t("Hanya baca", "Read only")}
                    </Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("Sebelumnya", "Previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("Halaman", "Page")} {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("Berikutnya", "Next")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      )}

      <Dialog open={Boolean(deleteEntry)} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <DialogContent className="max-w-[calc(100%-2rem)] gap-4 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Hapus entri waktu?", "Delete time entry?")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t(
              `Entri “${deleteEntry?.description || "Tanpa judul"}” akan dihapus permanen.`,
              `The entry “${deleteEntry?.description || "Untitled"}” will be permanently deleted.`,
            )}
          </p>
          <DialogFooter className="gap-2 sm:gap-3">
            <Button className="min-h-11 flex-1" variant="outline" onClick={() => setDeleteEntry(null)} disabled={deleteLoading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button className="min-h-11 flex-1" variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("Hapus", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={(open) => {
        setEditOpen(open);
        if (!open && onEditClose) onEditClose();
      }}>
        <DialogContent className="flex max-h-[min(90dvh,760px)] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-12">
            <DialogTitle>{t("Edit Log Waktu", "Edit time log")}</DialogTitle>
          </DialogHeader>

          <div className="grid min-h-0 grid-cols-1 gap-6 overflow-y-auto px-5 py-5 md:grid-cols-12">
            {/* Left Column - Track on */}
            <div className="space-y-4 md:col-span-7">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("Lacak Pada", "Track on")}</Label>
              </div>

              {/* Client & Project */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Klien & Proyek *", "Client & Project *")}</Label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <Briefcase className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t("Cari klien atau proyek...", "Search client or project...")}
                      value={editProjectSearch}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditProjectSearch(val);
                        setEditProjectSearchOpen(true);
                      }}
                      onFocus={() => {
                        // Don't auto open dropdown if text matches currently selected project
                        const currentClientName = clients.find((c) => c.id === editClientId)?.name || "";
                        const currentProjectName = projects.find((p) => p.id === editProjectId)?.name || "";
                        const selectedLabel = currentClientName && currentProjectName ? `${currentClientName} — ${currentProjectName}` : currentProjectName || currentClientName;
                        if (editProjectSearch.trim() !== selectedLabel.trim()) {
                          setEditProjectSearchOpen(true);
                        }
                      }}
                      className={`h-10 pl-9 text-sm ${editProjectError || editClientError ? "border-destructive" : ""}`}
                    />
                  </div>
                  {editProjectSearchOpen && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      {filteredEditProjectOptions.length === 0 ? (
                        <p className="p-2 text-xs text-muted-foreground">{t("Klien atau proyek tidak ditemukan", "No client or project found")}</p>
                      ) : (
                        filteredEditProjectOptions.map((opt) => (
                          <button
                            key={opt.projectId}
                            type="button"
                            className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editProjectId === opt.projectId ? "bg-accent font-medium" : ""}`}
                            onClick={() => {
                              setEditClientId(opt.clientId);
                              setEditProjectId(opt.projectId);
                              setEditProjectSearch(`${opt.clientName} — ${opt.projectName}`);
                              setEditProjectSearchOpen(false);
                              setEditTaskId("__none__");
                              setEditTaskSearch("");
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
                {editClientError || editProjectError ? <p className="text-xs text-destructive">{t("Klien & Proyek wajib dipilih", "Client & Project is required")}</p> : null}
              </div>

              {/* Task Input */}
              <div className="space-y-1.5">
                <Label className={`text-xs ${editTaskError ? "text-destructive" : ""}`}>{editTaskRequired ? t("Tugas *", "Task *") : t("Tugas (Opsional)", "Task (Optional)")}</Label>
                <div className="relative">
                  <div className="relative flex items-center">
                    <CheckSquare className="absolute left-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={editProjectId ? t("Cari tugas...", "Search task...") : t("Pilih klien & proyek dulu", "Select client & project first")}
                      value={editTaskSearch}
                      disabled={!editProjectId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditTaskSearch(val);
                        setEditTaskSearchOpen(Boolean(val.trim()));
                      }}
                      onFocus={() => {
                        if (editTaskSearch.trim() && editProjectId) setEditTaskSearchOpen(true);
                      }}
                      className={`h-10 pl-9 text-sm ${editTaskError ? "border-destructive" : ""}`}
                    />
                  </div>
                  {editTaskError ? <p className="text-xs text-destructive">{t("Task wajib dipilih untuk project Hourly/Retainer", "Task is required for Hourly/Retainer projects")}</p> : null}
                  {editTaskSearchOpen && editProjectId && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                      <button
                        type="button"
                        className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editTaskId === "__none__" ? "bg-accent font-medium" : ""}`}
                        onClick={() => {
                          setEditTaskId("__none__");
                          setEditTaskSearch("");
                          setEditTaskSearchOpen(false);
                        }}
                      >
                        {t("Tidak ada", "None")}
                      </button>
                      {filteredEditTaskOptions.length === 0 ? (
                        <p className="p-2 text-xs text-muted-foreground">{t("Tugas tidak ditemukan", "No task found")}</p>
                      ) : (
                        filteredEditTaskOptions.map((tk) => (
                          <button
                            key={tk.id}
                            type="button"
                            className={`w-full rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${editTaskId === tk.id ? "bg-accent font-medium" : ""}`}
                            onClick={() => {
                              handleEditTaskChange(tk.id);
                              setEditTaskSearch(tk.title);
                              setEditTaskSearchOpen(false);
                            }}
                          >
                            {tk.title}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t("Tambah deskripsi log...", "Add log description...")}
                  rows={4}
                  className="min-h-[100px] text-sm"
                />
              </div>

              {/* Tag Input */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Tag", "Tag")}</Label>
                <div className="relative flex items-center">
                  <TagIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
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
                <Label className="text-xs">{t("Durasi (HH:MM:SS)", "Duration (hh:mm:ss)")}</Label>
                <div className="relative flex items-center">
                  <Hourglass className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="00:00:00"
                    value={editMinutes ? `${String(Math.floor(Number(editMinutes)/60)).padStart(2,'0')}:${String(Number(editMinutes)%60).padStart(2,'0')}:00` : "00:00:00"}
                    onChange={(e) => {
                      const parts = e.target.value.split(":").map((p) => parseInt(p, 10) || 0);
                      const hrs = parts[0] || 0;
                      const mins = parts[1] || 0;
                      const secs = parts[2] || 0;
                      setEditMinutes(String(Math.max(0, hrs * 60 + mins + Math.round(secs / 60))));
                    }}
                    className={`h-10 pl-9 font-mono text-sm ${editMinutesError ? "border-destructive" : ""}`}
                  />
                </div>
                {editMinutesError ? <p className="text-xs text-destructive">{t("Durasi minimal 1 menit", "Duration minimum 1 minute")}</p> : null}
              </div>

              {/* Split row: Start time & End time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">{t("Jam Mulai", "Start time")}</Label>
                  <div className="relative flex items-center">
                    <Clock className="absolute left-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="time"
                      value={editStartTime}
                      onChange={(e) => {
                        const newStart = e.target.value;
                        setEditStartTime(newStart);
                        if (editEndTime && newStart) {
                          const [sH, sM] = newStart.split(":").map(Number);
                          const [eH, eM] = editEndTime.split(":").map(Number);
                          if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                            let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
                            if (diffMins < 0) diffMins += 24 * 60;
                            setEditMinutes(String(diffMins));
                          }
                        }
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
                      value={editEndTime}
                      onChange={(e) => {
                        const newEnd = e.target.value;
                        setEditEndTime(newEnd);
                        if (editStartTime && newEnd) {
                          const [sH, sM] = editStartTime.split(":").map(Number);
                          const [eH, eM] = newEnd.split(":").map(Number);
                          if (!isNaN(sH) && !isNaN(sM) && !isNaN(eH) && !isNaN(eM)) {
                            let diffMins = (eH * 60 + eM) - (sH * 60 + sM);
                            if (diffMins < 0) diffMins += 24 * 60;
                            setEditMinutes(String(diffMins));
                          }
                        }
                      }}
                      className="h-9 pl-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Tanggal", "Date")}</Label>
                <div className="relative flex items-center">
                  <CalendarIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              {/* Billable Select */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">{t("Tagihan / Billable", "Billable")}</Label>
                  <Select value={editBillable ? "yes" : "no"} onValueChange={(v) => setEditBillable(v === "yes")}>
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
          </div>

          <DialogFooter className="shrink-0 items-center justify-between gap-2 border-t bg-background px-5 py-4 sm:gap-3">
            <div>
              {editEntry && (
                <Button
                  variant="ghost"
                  type="button"
                  className="text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteEntry(editEntry)}
                  disabled={editLoading}
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  {t("Hapus log ini", "Delete this log")}
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <Button className="min-h-10 sm:min-w-24" variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
                {t("Batal", "Dismiss")}
              </Button>
              <Button className="min-h-10 sm:min-w-28" onClick={handleSaveEdit} disabled={editLoading || !editValid}>
                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
