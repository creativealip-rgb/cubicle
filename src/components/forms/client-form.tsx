"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, updateClient } from "@/lib/actions/clients";
import { isStaleServerActionError } from "@/lib/client-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ClientFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    tags?: string[];
    internalNotes?: string;
    portalSlug?: string;
    portalSlugEnabled?: boolean;
    portalEnabled?: boolean;
  };
  onSuccess?: () => void;
  redirectTo?: string;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function ClientForm({ mode, defaultValues, onSuccess, redirectTo }: ClientFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(defaultValues?.portalSlug));
  const [form, setForm] = useState({
    name: defaultValues?.name ?? "",
    companyName: defaultValues?.companyName ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    website: defaultValues?.website ?? "",
    address: defaultValues?.address ?? "",
    tags: defaultValues?.tags?.join(", ") ?? "",
    internalNotes: defaultValues?.internalNotes ?? "",
    portalSlug: defaultValues?.portalSlug ?? "",
    portalSlugEnabled: defaultValues?.portalSlugEnabled ?? true,
    // Create default: activate portal when slug enabled (user can uncheck).
    portalEnabled: defaultValues?.portalEnabled ?? (mode === "create"),
  });

  async function handleSave() {
    if (loading) return;
    setLoading(true);
    try {
      const data = {
        name: form.name,
        companyName: form.companyName || undefined,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        address: form.address || undefined,
        tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        internalNotes: form.internalNotes || undefined,
        portalSlug: form.portalSlug || undefined,
        portalSlugEnabled: form.portalSlugEnabled,
        ...(mode === "create" ? { portalEnabled: form.portalEnabled } : {}),
      };

      if (mode === "create") {
        const result = await createClient(data);
        if (result && typeof result === "object" && "ok" in result && result.ok === false) {
          toast.error(result.error || "Limit plan tercapai");
          return;
        }
        toast.success("Klien dibuat");
      } else if (defaultValues?.id) {
        await updateClient(defaultValues.id, data);
        toast.success("Klien diperbarui");
      }

      onSuccess?.();
      router.refresh();
      if (redirectTo) router.push(redirectTo);
    } catch (err: unknown) {
      const msg = isStaleServerActionError(err)
        ? "App baru di-deploy. Refresh halaman, lalu coba lagi."
        : err instanceof Error
          ? err.message
          : "Terjadi kesalahan";
      toast.error(msg);
      if (isStaleServerActionError(err)) {
        // Hard refresh so browser picks new Server Action IDs
        setTimeout(() => window.location.reload(), 800);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await handleSave();
  }

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((prev) => {
      const next = { ...prev, [k]: v };
      if (k === "name" && typeof v === "string" && !slugTouched) {
        next.portalSlug = slugify(v);
      }
      return next;
    });
  }

  function setPortalSlug(value: string) {
    setSlugTouched(true);
    set("portalSlug", slugify(value));
  }

  function regeneratePortalSlug() {
    setSlugTouched(true);
    set("portalSlug", slugify(form.companyName || form.name));
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nama *</Label>
        <Input id="name" value={form.name} onChange={(e) => set("name", e.target.value)} required placeholder="Nama kontak klien" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="companyName">Perusahaan</Label>
        <Input id="companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder="Perusahaan name" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telepon</Label>
          <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+62..." />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Alamat</Label>
        <Input id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Alamat lengkap" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tags">Tag (pisahkan dengan koma)</Label>
        <Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="branding, web, social" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="internalNotes">Catatan Internal</Label>
        <Input id="internalNotes" value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} placeholder="Catatan privat..." />
      </div>
      <div className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_auto] md:items-end">
        <div className="space-y-2">
          <Label htmlFor="portalSlug">Client portal slug</Label>
          <div className="flex gap-2">
            <Input id="portalSlug" value={form.portalSlug} onChange={(e) => setPortalSlug(e.target.value)} placeholder="kopi-senja" />
            <Button type="button" variant="outline" onClick={regeneratePortalSlug}>Generate</Button>
          </div>
          <p className="text-xs text-muted-foreground">Short link: /client-portal/{form.portalSlug || "slug"}</p>
          <p className="text-xs text-muted-foreground">Use lowercase letters, numbers, and dashes. Must be unique.</p>
        </div>
        <div className="flex flex-col gap-2 pb-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.portalSlugEnabled} onChange={(e) => set("portalSlugEnabled", e.target.checked)} />
            Slug aktif
          </label>
          {mode === "create" && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.portalEnabled} onChange={(e) => set("portalEnabled", e.target.checked)} />
              Aktifkan portal sekarang
            </label>
          )}
        </div>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Menyimpan..." : mode === "create" ? "Buat Klien" : "Simpan Perubahan"}
      </Button>
    </form>
  );
}
