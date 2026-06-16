"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProjectFormProps {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: {
    id?: string;
    name?: string;
    description?: string;
    clientId?: string;
    status?: string;
    dueDate?: string;
    clientVisible?: boolean;
  };
  onSuccess?: () => void;
}

export function ProjectForm({ mode, clientId, defaultValues, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    clientId: defaultValues?.clientId ?? clientId ?? "",
    status: defaultValues?.status ?? "active",
    dueDate: defaultValues?.dueDate ?? "",
    clientVisible: defaultValues?.clientVisible ?? false,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: form.name,
        description: form.description || undefined,
        clientId: form.clientId,
        status: form.status as "draft" | "active" | "on_hold" | "completed" | "cancelled",
        dueDate: form.dueDate || undefined,
        clientVisible: form.clientVisible,
      };

      if (mode === "create") {
        await createProject(data);
        toast.success("Project created");
      } else if (defaultValues?.id) {
        await updateProject(defaultValues.id, data);
        toast.success("Project updated");
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
        <Label htmlFor="name">Project Name *</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Website Redesign" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Project details..." />
      </div>
      {!clientId && (
        <div className="space-y-2">
          <Label htmlFor="clientId">Client *</Label>
          <Input id="clientId" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} required placeholder="Client ID" />
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="clientVisible"
          checked={form.clientVisible}
          onChange={(e) => setForm((p) => ({ ...p, clientVisible: e.target.checked }))}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="clientVisible">Visible to client</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : mode === "create" ? "Create Project" : "Save Changes"}
      </Button>
    </form>
  );
}
