"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useT } from "@/lib/i18n-client";

interface TaskFormProps {
  mode: "create" | "edit";
  projectId?: string;
  taskMode?: "workflow" | "reusable";
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

export function TaskForm({ mode, projectId, taskMode = "workflow", defaultValues, members = [], projects = [], onSuccess }: TaskFormProps) {
  const { t } = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: defaultValues?.title ?? "",
    description: defaultValues?.description ?? "",
    projectId: defaultValues?.projectId ?? projectId ?? "",
    status: defaultValues?.status ?? "todo",
    priority: defaultValues?.priority ?? "medium",
    assigneeId: defaultValues?.assigneeId ?? "",
    dueDate: defaultValues?.dueDate ?? "",
    clientVisible: defaultValues?.clientVisible ?? false,
    behavior: defaultValues?.behavior ?? projects.find((p) => p.id === (defaultValues?.projectId ?? projectId))?.defaultBehavior ?? "one_time",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        assigneeId: form.assigneeId || undefined,
        clientVisible: taskMode === "workflow" ? form.clientVisible : undefined,
        status: taskMode === "workflow" ? form.status as "todo" | "in_progress" | "review" | "done" : undefined,
        priority: taskMode === "workflow" ? form.priority as "low" | "medium" | "high" | "urgent" : undefined,
        dueDate: taskMode === "workflow" ? form.dueDate || undefined : undefined,
        mode: taskMode,
      };

      if (mode === "create") {
        await createTask(data);
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
          clientVisible: defaultValues?.clientVisible ?? false,
          behavior: projects.find((p) => p.id === (defaultValues?.projectId ?? projectId))?.defaultBehavior ?? "one_time",
        });
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">{t("Judul", "Title")} *</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder={t("Judul tugas", "Task title")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">{t("Deskripsi", "Description")}</Label>
        <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder={t("Detail...", "Details...")} />
      </div>
      {!projectId && (
        <div className="space-y-2">
          <Label>{t("Proyek", "Project")} *</Label>
          <Select value={form.projectId} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v, behavior: projects.find((candidate) => candidate.id === v)?.defaultBehavior ?? "one_time" }))} required>
            <SelectTrigger><SelectValue placeholder={t("Pilih proyek", "Select project")} /></SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {taskMode === "workflow" ? (
      <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{t("Status", "Status")}</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue placeholder={t("Status", "Status")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">{t("Belum Mulai", "To Do")}</SelectItem>
              <SelectItem value="in_progress">{t("Dikerjakan", "In Progress")}</SelectItem>
              <SelectItem value="review">{t("Ditinjau", "Review")}</SelectItem>
              <SelectItem value="done">{t("Selesai", "Done")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t("Prioritas", "Priority")}</Label>
          <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
            <SelectTrigger><SelectValue placeholder={t("Prioritas", "Priority")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">{t("Rendah", "Low")}</SelectItem>
              <SelectItem value="medium">{t("Sedang", "Medium")}</SelectItem>
              <SelectItem value="high">{t("Tinggi", "High")}</SelectItem>
              <SelectItem value="urgent">{t("Mendesak", "Urgent")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t("Penanggung Jawab", "Assignee")}</Label>
        <Select
          value={form.assigneeId || "unassigned"}
          onValueChange={(v) => setForm((p) => ({ ...p, assigneeId: v === "unassigned" ? "" : v }))}
        >
          <SelectTrigger><SelectValue placeholder={t("Belum ditugaskan", "Unassigned")} /></SelectTrigger>
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
      <div className="space-y-2">
        <Label htmlFor="dueDate">{t("Jatuh Tempo", "Due Date")}</Label>
        <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="clientVisible"
          checked={form.clientVisible}
          onChange={(e) => setForm((p) => ({ ...p, clientVisible: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="clientVisible">{t("Terlihat oleh klien", "Visible to client")}</Label>
      </div>
      </>
      ) : null}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? t("Menyimpan...", "Saving...") : mode === "create" ? t("Buat Tugas", "Create Task") : t("Simpan Perubahan", "Save Changes")}
      </Button>
    </form>
  );
}
