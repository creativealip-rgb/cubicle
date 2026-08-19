"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { toast } from "sonner";
import { archiveTask, restoreTask, createTask, updateTask } from "@/lib/actions/tasks";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAppTransition } from "@/lib/transition-provider";
import { PermanentDeleteButton } from "@/components/shared/permanent-delete-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/lib/i18n-client";

interface TaskFormProps {
  mode: "create" | "edit";
  projectId?: string;
  taskMode?: "workflow" | "reusable";
  lifecycle?: "active" | "archived";
  defaultValues?: {
    id?: string;
    title?: string;
    description?: string;
    projectId?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    dueDate?: string;
    clientVisible?: boolean;
    behavior?: "one_time" | "recurring";
  };
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  projects?: Array<{ id: string; name: string; defaultBehavior?: "one_time" | "recurring" }>;
  onSuccess?: () => void;
}

export function TaskForm({ mode, projectId, taskMode = "workflow", lifecycle = "active", defaultValues, members = [], projects = [], onSuccess }: TaskFormProps) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);

  const initialSelectedProject = projects.find((p) => p.id === (defaultValues?.projectId ?? projectId ?? ""));
  const [projectSearch, setProjectSearch] = useState(initialSelectedProject?.name ?? "");
  const [projectSearchOpen, setProjectSearchOpen] = useState(false);
  const projectContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (projectContainerRef.current && !projectContainerRef.current.contains(e.target as Node)) {
        setProjectSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProjects = useMemo(() => {
    const term = projectSearch.toLowerCase().trim();
    if (!term) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(term));
  }, [projects, projectSearch]);

  const [form, setForm] = useState({
    title: defaultValues?.title ?? "",
    description: defaultValues?.description ?? "",
    projectId: defaultValues?.projectId ?? projectId ?? "",
    status: defaultValues?.status ?? "todo",
    priority: defaultValues?.priority ?? "medium",
    assigneeId: defaultValues?.assigneeId ?? "",
    dueDate: defaultValues?.dueDate ?? "",
    clientVisible: defaultValues?.clientVisible ?? mode === "create",
    behavior: defaultValues?.behavior ?? projects.find((p) => p.id === (defaultValues?.projectId ?? projectId))?.defaultBehavior ?? "one_time",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        title: form.title,
        description: mode === "edit" ? form.description || null : form.description || undefined,
        projectId: form.projectId,
        assigneeId: mode === "edit" ? form.assigneeId || null : form.assigneeId || undefined,
        clientVisible: form.clientVisible,
        status: taskMode === "workflow" ? (form.status as "todo" | "in_progress" | "review" | "done") : undefined,
        priority: taskMode === "workflow" ? (form.priority as "low" | "medium" | "high" | "urgent") : undefined,
        dueDate: taskMode === "workflow" ? (mode === "edit" ? form.dueDate || null : form.dueDate || undefined) : undefined,
        mode: taskMode,
      };

      if (mode === "create") {
        await createTask({
          ...data,
          description: data.description ?? undefined,
          assigneeId: data.assigneeId ?? undefined,
          dueDate: data.dueDate ?? undefined,
        });
        toast.success(t("Tugas dibuat", "Task created"));
      } else if (defaultValues?.id) {
        const updateData: Record<string, unknown> = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.description !== undefined) updateData.description = data.description;
        if (data.status !== undefined) updateData.status = data.status;
        if (data.priority !== undefined) updateData.priority = data.priority;
        if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
        if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
        if (data.clientVisible !== undefined) updateData.clientVisible = data.clientVisible;
        await updateTask(defaultValues.id, updateData);
        toast.success(t("Tugas diperbarui", "Task updated"));
      }

      onSuccess?.();
      if (mode === "create") {
        setForm({
          title: "",
          description: "",
          projectId: defaultValues?.projectId ?? projectId ?? "",
          status: defaultValues?.status ?? "todo",
          priority: defaultValues?.priority ?? "medium",
          assigneeId: defaultValues?.assigneeId ?? "",
          dueDate: defaultValues?.dueDate ?? "",
          clientVisible: defaultValues?.clientVisible ?? mode === "create",
          behavior: projects.find((p) => p.id === (defaultValues?.projectId ?? projectId))?.defaultBehavior ?? "one_time",
        });
        setProjectSearch(initialSelectedProject?.name ?? "");
      }
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Left Column: Detail Utama */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Detail Tugas", "Task Details")}
          </h3>

          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-medium">{t("Judul", "Title")} *</Label>
            <Input
              id="title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              required
              placeholder={t("Judul tugas", "Task title")}
              className="h-9 text-sm"
            />
          </div>

          {!projectId && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">{t("Proyek", "Project")} *</Label>
              <div ref={projectContainerRef} className="relative">
                <Input
                  placeholder={t("Cari proyek...", "Search project...")}
                  value={projectSearch}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProjectSearch(val);
                    setProjectSearchOpen(true);
                  }}
                  onFocus={() => {
                    const currentProject = projects.find((p) => p.id === form.projectId);
                    if (projectSearch.trim() !== currentProject?.name.trim()) {
                      setProjectSearchOpen(true);
                    }
                  }}
                  className="h-9 text-sm"
                />
                {projectSearchOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
                    {filteredProjects.length === 0 ? (
                      <p className="p-2 text-xs text-muted-foreground">{t("Proyek tidak ditemukan", "No project found")}</p>
                    ) : (
                      filteredProjects.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent ${form.projectId === p.id ? "bg-accent font-medium" : ""}`}
                          onClick={() => {
                            setForm((prev) => ({ ...prev, projectId: p.id, behavior: p.defaultBehavior ?? "one_time" }));
                            setProjectSearch(p.name);
                            setProjectSearchOpen(false);
                          }}
                        >
                          <span>{p.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs font-medium">{t("Deskripsi", "Description")}</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder={t("Detail tugas...", "Task details...")}
              rows={4}
              className="min-h-[110px] resize-y text-xs"
            />
          </div>
        </div>

        {/* Right Column: Status & Penugasan */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("Status & Penugasan", "Status & Assignment")}
          </h3>

          {taskMode === "workflow" && (
            <>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("Status", "Status")}</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t("Status", "Status")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{t("Belum Mulai", "To Do")}</SelectItem>
                      <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
                      <SelectItem value="review">{t("Ditinjau", "Review")}</SelectItem>
                      <SelectItem value="done">{t("Selesai", "Done")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t("Prioritas", "Priority")}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t("Prioritas", "Priority")} /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
                      <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
                      <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
                      <SelectItem value="urgent">{t("Mendesak", "Urgent")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dueDate" className="text-xs font-medium">{t("Jatuh Tempo", "Due Date")}</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{t("Penanggung Jawab", "Assignee")}</Label>
            <Select
              value={form.assigneeId || "unassigned"}
              onValueChange={(v) => setForm((p) => ({ ...p, assigneeId: v === "unassigned" ? "" : v }))}
            >
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t("Belum ditugaskan", "Unassigned")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">{t("Belum ditugaskan", "Unassigned")}</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name || m.email || m.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 rounded-lg border p-3 cursor-pointer bg-muted/10 hover:bg-muted/20 transition-colors">
            <input
              type="checkbox"
              id="clientVisible"
              checked={form.clientVisible}
              onChange={(e) => setForm((p) => ({ ...p, clientVisible: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-xs font-medium">{t("Terlihat oleh klien di portal", "Visible to client in portal")}</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        <div>
          {mode === "edit" && defaultValues?.id && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={async () => {
                  if (lifecycle === "active") await archiveTask(defaultValues.id!);
                  else await restoreTask(defaultValues.id!);
                  toast.success(lifecycle === "active" ? t("Tugas diarsipkan", "Task archived") : t("Tugas dipulihkan", "Task restored"));
                  onSuccess?.();
                  refresh();
                }}
              >
                {lifecycle === "active" ? t("Arsipkan", "Archive") : t("Pulihkan", "Restore")}
              </Button>
              <PermanentDeleteButton entityType="task" entityId={defaultValues.id} entityName={form.title} />
            </div>
          )}
        </div>
        <LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")} className="w-full sm:w-auto sm:min-w-36" size="sm">
          {mode === "create" ? t("Buat Tugas", "Create Task") : t("Simpan Perubahan", "Save Changes")}
        </LoadingButton>
      </div>
    </form>
  );
}
