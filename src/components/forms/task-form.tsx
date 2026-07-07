"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTask, updateTask } from "@/lib/actions/tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TaskFormProps {
  mode: "create" | "edit";
  projectId?: string;
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
  };
  members?: Array<{ id: string; name: string | null; email: string | null }>;
  onSuccess?: () => void;
}

export function TaskForm({ mode, projectId, defaultValues, members = [], onSuccess }: TaskFormProps) {
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
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        title: form.title,
        description: form.description || undefined,
        projectId: form.projectId,
        status: form.status as "todo" | "in_progress" | "review" | "done",
        priority: form.priority as "low" | "medium" | "high" | "urgent",
        assigneeId: form.assigneeId || undefined,
        dueDate: form.dueDate || undefined,
        clientVisible: form.clientVisible,
      };

      if (mode === "create") {
        await createTask(data);
        toast.success("Task dibuat");
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
        toast.success("Task diperbarui");
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
        <Label htmlFor="title">Judul *</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Judul task" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detail..." />
      </div>
      {!projectId && (
        <div className="space-y-2">
          <Label htmlFor="projectId">Project *</Label>
          <Input id="projectId" value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} required placeholder="ID project" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">Dalam Proses</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Selesai</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Prioritas</Label>
          <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
            <SelectTrigger><SelectValue placeholder="Prioritas" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Rendah</SelectItem>
              <SelectItem value="medium">Sedang</SelectItem>
              <SelectItem value="high">Tinggi</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Penanggung Jawab</Label>
        <Select
          value={form.assigneeId || "unassigned"}
          onValueChange={(v) => setForm((p) => ({ ...p, assigneeId: v === "unassigned" ? "" : v }))}
        >
          <SelectTrigger><SelectValue placeholder="Belum ditugaskan" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Belum ditugaskan</SelectItem>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name || m.email || m.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate">Jatuh Tempo</Label>
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
        <Label htmlFor="clientVisible">Terlihat oleh klien</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Menyimpan..." : mode === "create" ? "Buat Task" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
