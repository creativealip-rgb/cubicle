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
  clients?: Array<{ id: string; name: string }>;
  defaultValues?: {
    id?: string;
    name?: string;
    description?: string;
    clientId?: string;
    status?: string;
    billingType?: string;
    startDate?: string;
    finishDate?: string;
    dueDate?: string;
    clientVisible?: boolean;
  };
  onSuccess?: () => void;
}

export function ProjectForm({ mode, clientId, clients = [], defaultValues, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    clientId: defaultValues?.clientId ?? clientId ?? "",
    status: defaultValues?.status ?? "active",
    billingType: defaultValues?.billingType ?? "project",
    startDate: defaultValues?.startDate ?? "",
    finishDate: defaultValues?.finishDate ?? "",
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
        billingType: form.billingType as "project" | "hours",
        startDate: form.startDate || undefined,
        finishDate: form.finishDate || undefined,
        dueDate: form.dueDate || undefined,
        clientVisible: form.clientVisible,
      };

      if (mode === "create") {
        await createProject(data);
        toast.success("Project dibuat");
      } else if (defaultValues?.id) {
        await updateProject(defaultValues.id, data);
        toast.success("Project diperbarui");
      }

      router.refresh();
      onSuccess?.();
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
        <Label htmlFor="name">Nama Project *</Label>
        <Input id="name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required placeholder="Redesign website" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input id="description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detail project..." />
      </div>
      {!clientId && (
        <div className="space-y-2">
          <Label htmlFor="clientId">Klien *</Label>
          {clients.length > 0 ? (
            <Select value={form.clientId} onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))} required>
              <SelectTrigger id="clientId">
                <SelectValue placeholder="Pilih klien" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input id="clientId" value={form.clientId} onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value }))} required placeholder="ID klien" />
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Jenis Project</Label>
          <Select value={form.billingType} onValueChange={(v) => setForm((p) => ({ ...p, billingType: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Jenis project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="project">By Project</SelectItem>
              <SelectItem value="hours">By Hours</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Aktif</SelectItem>
              <SelectItem value="on_hold">Ditahan</SelectItem>
              <SelectItem value="completed">Selesai</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Mulai</Label>
          <Input id="startDate" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finishDate">Selesai</Label>
          <Input id="finishDate" type="date" value={form.finishDate} onChange={(e) => setForm((p) => ({ ...p, finishDate: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Jatuh Tempo</Label>
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
        <Label htmlFor="clientVisible">Terlihat oleh klien</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Menyimpan..." : mode === "create" ? "Buat Project" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
