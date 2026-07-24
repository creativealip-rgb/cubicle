"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteTimeEntry, updateTimeEntry } from "@/lib/actions/time";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
  ChevronLeft,
  ChevronRight,
  Clock,
  Trash2,
  Filter,
  Pencil,
  Loader2,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";

const PAGE_SIZE = 10;

interface TimeEntry {
  id: string;
  description: string | null;
  tags: string | null;
  durationMinutes: number | null;
  manualMinutes?: number | null;
  billable: boolean;
  hourlyRate: string | number | null;
  startTime: Date | string | null;
  endTime: Date | string | null;
  status: string;
  clientId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  clientName: string | null;
  projectName: string | null;
  projectCurrency: string | null;
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
}

interface Task {
  id: string;
  title: string;
  projectId?: string | null;
}

interface TimesheetProps {
  entries: TimeEntry[];
  clients: Client[];
  projects: Project[];
  tasks?: Task[];
}

function toDateInputValue(value: Date | string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export function Timesheet({ entries, clients, projects, tasks = [] }: TimesheetProps) {
  const { t, locale } = useT();
  const router = useRouter();

  const [clientFilter, setClientFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [billableFilter, setBillableFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [editOpen, setEditOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editTaskId, setEditTaskId] = useState("__none__");
  const [editDate, setEditDate] = useState("");
  const [editMinutes, setEditMinutes] = useState("");
  const [editBillable, setEditBillable] = useState(true);
  const [editStatus, setEditStatus] = useState<"draft" | "approved">("draft");
  // True when description was auto-filled from task title in this edit session.
  const [descriptionFromTask, setDescriptionFromTask] = useState(false);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (clientFilter !== "all" && e.clientName !== clientFilter) return false;
      if (projectFilter !== "all" && e.projectName !== projectFilter) return false;
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
        const entryDate = e.startTime ? new Date(e.startTime).toISOString().split("T")[0] : "";
        if (entryDate < dateFrom) return false;
      }
      if (dateTo) {
        const entryDate = e.startTime ? new Date(e.startTime).toISOString().split("T")[0] : "";
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

  const editProjects = useMemo(() => {
    if (!editClientId) return projects;
    return projects.filter((p) => p.clientId === editClientId);
  }, [editClientId, projects]);

  const editTasks = useMemo(() => {
    if (!editProjectId) return [];
    return tasks.filter((tk) => tk.projectId === editProjectId);
  }, [editProjectId, tasks]);

  function formatDuration(minutes: number | null): string {
    const hLabel = t("j", "h");
    const mLabel = t("mnt", "m");
    if (!minutes) return `0${mLabel}`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}${mLabel}`;
    return `${h}${hLabel} ${m}${mLabel}`;
  }

  function formatRate(rate: string | number | null, currency: string | null): string | null {
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

  async function handleDelete(entryId: string) {
    try {
      await deleteTimeEntry(entryId);
      toast.success(t("Entri dihapus", "Entry deleted"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"));
    }
  }

  function openEdit(entry: TimeEntry) {
    if (entry.status === "invoiced") {
      toast.error(t("Entri sudah di-invoice", "Entry already invoiced"));
      return;
    }
    setEditEntry(entry);
    setEditDescription(entry.description || "");
    setEditTags(entry.tags || "");
    setEditClientId(entry.clientId || "");
    setEditProjectId(entry.projectId || "");
    setEditTaskId(entry.taskId || "__none__");
    setEditDate(toDateInputValue(entry.startTime));
    setEditMinutes(String(entry.durationMinutes ?? entry.manualMinutes ?? 0));
    setEditBillable(entry.billable);
    setEditStatus(entry.status === "approved" ? "approved" : "draft");
    setDescriptionFromTask(false);
    setEditOpen(true);
  }

  function handleEditTaskChange(nextTaskId: string) {
    setEditTaskId(nextTaskId);
    if (!nextTaskId || nextTaskId === "__none__") {
      if (descriptionFromTask) {
        setEditDescription("");
        setDescriptionFromTask(false);
      }
      return;
    }
    const task = tasks.find((tk) => tk.id === nextTaskId);
    if (!task?.title) return;
    // Auto-map when blank or previously auto-filled from another task.
    if (!editDescription.trim() || descriptionFromTask) {
      setEditDescription(task.title);
      setDescriptionFromTask(true);
    }
  }

  async function handleSaveEdit() {
    if (!editEntry) return;
    if (!editClientId || !editProjectId) {
      toast.error(t("Klien dan proyek wajib", "Client and project required"));
      return;
    }
    const minutes = Number(editMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      toast.error(t("Durasi menit harus > 0", "Duration minutes must be > 0"));
      return;
    }

    setEditLoading(true);
    try {
      const startIso = editDate
        ? new Date(`${editDate}T00:00:00.000Z`).toISOString()
        : editEntry.startTime
          ? new Date(editEntry.startTime).toISOString()
          : new Date().toISOString();
      const endIso = new Date(new Date(startIso).getTime() + minutes * 60 * 1000).toISOString();

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
        status: editStatus,
      });

      toast.success(t("Entri diperbarui", "Entry updated"));
      setEditOpen(false);
      setEditEntry(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal update", "Failed to update"));
    } finally {
      setEditLoading(false);
    }
  }

  const uniqueClients = useMemo(() => {
    const set = new Set(entries.map((e) => e.clientName).filter(Boolean));
    return Array.from(set) as string[];
  }, [entries]);

  const uniqueProjects = useMemo(() => {
    const set = new Set(entries.map((e) => e.projectName).filter(Boolean));
    return Array.from(set) as string[];
  }, [entries]);

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
      </div>

      <Card className="rounded-lg border bg-card">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{t("Filter", "Filter")}</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-[10px]">{t("Klien", "Client")}</Label>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder={t("Semua", "All")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("Semua Klien", "All Clients")}</SelectItem>
                  {uniqueClients.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
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
                  {uniqueProjects.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
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
            <div className="flex flex-col gap-2 sm:flex-row col-span-2 md:col-span-1">
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
      </Card>

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

          {pageEntries.map((entry, index) => (
            <Card key={entry.id} className="rounded-none border-0 shadow-none">
              <CardContent
                className={`flex items-center justify-between gap-2 !border-b border-slate-200 p-3 hover:!bg-slate-100/70 ${
                  index % 2 === 0 ? "!bg-white" : "!bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {entry.description || t("Tanpa judul", "Untitled")}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      {entry.clientName && <span>{entry.clientName}</span>}
                      {entry.projectName && (
                        <>
                          <span>·</span>
                          <span>{entry.projectName}</span>
                        </>
                      )}
                      {entry.taskTitle && (
                        <>
                          <span>·</span>
                          <span>{entry.taskTitle}</span>
                        </>
                      )}
                      <span>·</span>
                      <span>{entry.userName || t("Tidak diketahui", "Unknown")}</span>
                      <span>·</span>
                      <span>
                        {entry.startTime
                          ? new Date(entry.startTime).toLocaleDateString(locale)
                          : "—"}
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
                <div className="flex items-center gap-1 flex-shrink-0">
                  {entry.billable && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatRate(entry.hourlyRate, entry.projectCurrency)
                        ? `${formatRate(entry.hourlyRate, entry.projectCurrency)} / ${t("jam", "hr")}`
                        : t("Bisa Ditagih", "Billable")}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[10px]">
                    {formatDuration(entry.durationMinutes)}
                  </Badge>
                  {entry.status === "invoiced" ? (
                    <Badge variant="outline" className="text-[10px]">
                      Invoice
                    </Badge>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(entry)}
                      title={t("Edit entri", "Edit entry")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => handleDelete(entry.id)}
                    disabled={entry.status === "invoiced"}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-2 border-t px-3 py-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
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

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("Edit entri waktu", "Edit time entry")}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Deskripsi", "Description")}</Label>
              <Input
                value={editDescription}
                onChange={(e) => {
                  setDescriptionFromTask(false);
                  setEditDescription(e.target.value);
                }}
                className="h-9"
              />
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Pilih task → deskripsi auto-map dari judul (bisa diedit).",
                  "Pick a task → description auto-maps from title (editable).",
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Klien", "Client")}</Label>
                <Select
                  value={editClientId}
                  onValueChange={(v) => {
                    setEditClientId(v);
                    setEditProjectId("");
                    setEditTaskId("__none__");
                  }}
                >
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
                  value={editProjectId}
                  onValueChange={(v) => {
                    setEditProjectId(v);
                    setEditTaskId("__none__");
                  }}
                  disabled={!editClientId}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t("Pilih proyek", "Select project")} />
                  </SelectTrigger>
                  <SelectContent>
                    {editProjects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Tugas", "Task")}</Label>
              <Select
                value={editTaskId}
                onValueChange={handleEditTaskChange}
                disabled={!editProjectId}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={t("Opsional", "Optional")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t("Tidak ada", "None")}</SelectItem>
                  {editTasks.map((tk) => (
                    <SelectItem key={tk.id} value={tk.id}>
                      {tk.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Tanggal", "Date")}</Label>
                <Input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Durasi (menit)", "Duration (minutes)")}</Label>
                <Input
                  type="number"
                  min="1"
                  value={editMinutes}
                  onChange={(e) => setEditMinutes(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Tag", "Tags")}</Label>
              <Input
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="Research, Follow Up"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">{t("Bisa ditagih", "Billable")}</Label>
                <Select
                  value={editBillable ? "yes" : "no"}
                  onValueChange={(v) => setEditBillable(v === "yes")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">{t("Ya", "Yes")}</SelectItem>
                    <SelectItem value="no">{t("Tidak", "No")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => setEditStatus(v as "draft" | "approved")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleSaveEdit} disabled={editLoading}>
              {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("Simpan", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
