"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createProject, updateProject } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPackagesByProject, getWorkspacePackages } from "@/lib/actions/packages";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

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
    currency?: string;
    rate?: string;
    budget?: string;
    startDate?: string;
    finishDate?: string;
    dueDate?: string;
    clientVisible?: boolean;
    selectedPackageId?: string | null;
  };
  onSuccess?: () => void;
}

export function ProjectForm({ mode, clientId, clients = [], defaultValues, onSuccess }: ProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [projectPackages, setProjectPackages] = useState<Array<{ id: string; name: string; hours: number | null; price: string; currency: string }>>([]);
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    clientId: defaultValues?.clientId ?? clientId ?? "",
    status: defaultValues?.status ?? "active",
    billingType: defaultValues?.billingType ?? "project",
    currency: defaultValues?.currency ?? "IDR",
    rate: defaultValues?.rate ?? "",
    budget: defaultValues?.budget ?? "",
    startDate: defaultValues?.startDate ?? "",
    finishDate: defaultValues?.finishDate ?? "",
    dueDate: defaultValues?.dueDate ?? "",
    clientVisible: defaultValues?.clientVisible ?? false,
    selectedPackageId: defaultValues?.selectedPackageId ?? "",
  });

  // Fetch selectable packages when billing type is "package".
  // Source = workspace catalog (reusable templates) + any legacy per-project
  // packages (when editing) so existing assignments stay visible.
  useEffect(() => {
    if (form.billingType !== "package") return;
    async function load() {
      try {
        const catalog = await getWorkspacePackages();
        const merged = catalog.map((p) => ({
          id: p.id,
          name: p.name,
          hours: p.hours,
          price: p.price,
          currency: p.currency,
        }));
        if (mode === "edit" && defaultValues?.id) {
          const legacy = await getPackagesByProject(defaultValues.id);
          for (const p of legacy) {
            if (!merged.some((m) => m.id === p.id)) {
              merged.push({ id: p.id, name: p.name, hours: p.hours, price: p.price, currency: p.currency });
            }
          }
        }
        setProjectPackages(merged);
      } catch {
        /* ignore */
      }
    }
    load();
  }, [mode, defaultValues?.id, form.billingType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        name: form.name,
        description: form.description || undefined,
        clientId: form.clientId,
        status: form.status as "draft" | "active" | "on_hold" | "completed" | "cancelled",
        billingType: form.billingType as "project" | "hours" | "package",
        currency: form.currency,
        rate: form.rate ? Number(form.rate) : undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        startDate: form.startDate || undefined,
        finishDate: form.finishDate || undefined,
        dueDate: form.dueDate || undefined,
        clientVisible: form.clientVisible,
        selectedPackageId: form.selectedPackageId || undefined,
      };

      if (mode === "create") {
        await createProject(data);
        toast.success("Project dibuat");
      } else if (defaultValues?.id) {
        await updateProject(defaultValues.id, data);
        toast.success("Project diperbarui");
      }

      onSuccess?.();
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
              <SelectItem value="package">By Package</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {form.billingType === "hours" && (
        <div className="space-y-2">
          <Label htmlFor="rate">Rate per Jam ({form.currency})</Label>
          <Input id="rate" type="number" step="0.01" min="0" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} placeholder="13" />
        </div>
      )}
      {form.billingType === "project" && (
        <div className="space-y-2">
          <Label htmlFor="budget">Budget ({form.currency})</Label>
          <Input id="budget" type="number" step="0.01" min="0" value={form.budget} onChange={(e) => setForm((p) => ({ ...p, budget: e.target.value }))} placeholder="25000000" />
        </div>
      )}
      {form.billingType === "package" && (
        <div className="space-y-2">
          <Label>Paket</Label>
          {projectPackages.length > 0 ? (
            <>
              <Select
                value={form.selectedPackageId || "__none__"}
                onValueChange={(v) => setForm((p) => ({ ...p, selectedPackageId: v === "__none__" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih paket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Belum ada paket dipilih</SelectItem>
                  {projectPackages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name} — {pkg.hours ? `${pkg.hours} jam` : "custom"} · {formatMoney(pkg.price, pkg.currency || "IDR")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Kelola daftar paket di{" "}
                <Link href="/app/packages" className="underline hover:text-foreground" target="_blank">
                  menu Paket
                </Link>
                .
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Belum ada paket di katalog. Buat dulu di{" "}
              <Link href="/app/packages" className="underline hover:text-foreground" target="_blank">
                menu Paket
              </Link>
              , lalu pilih di sini.
            </p>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Mata Uang *</Label>
          <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))} required>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="IDR">IDR - Rupiah</SelectItem>
              <SelectItem value="USD">USD - Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - Pound</SelectItem>
              <SelectItem value="SGD">SGD - Dollar SG</SelectItem>
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
