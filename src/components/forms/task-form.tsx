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
  onSuccess?: () => void;
}

export function TaskForm({ mode, projectId, defaultValues, onSuccess }: TaskFormProps) {
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
        toast.success("Task created");
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
        toast.success("Task updated");
      }

      router.refresh();
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required placeholder="Task title" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Details..." />
      </div>
      {!projectId && (
        <div className="space-y-2">
          <Label htmlFor="projectId">Project *</Label>
          <Input id="projectId" value={form.projectId} onChange={(e) => setForm((p) => ({ ...p, projectId: e.target.value }))} required placeholder="Project ID" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}>
            <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
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
        <Label htmlFor="clientVisible">Client visible</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : mode === "create" ? "Create Task" : "Save Changes"}
      </Button>
    </form>
  );
}
