"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, generateUniquePortalSlug, updateClient } from "@/lib/actions/clients";
import { isStaleServerActionError } from "@/lib/client-errors";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { Textarea } from "@/components/ui/textarea";

interface ClientFormProps {
  mode: "create" | "edit";
  defaultValues?: {
    id?: string;
    clientNumber?: string | null;
    name?: string;
    companyName?: string;
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
    tags?: string[];
    internalNotes?: string;
    portalSlug?: string;
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
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
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
    portalEnabled: defaultValues?.portalEnabled ?? mode === "create",
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
        tags: form.tags
          ? form.tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [],
        internalNotes: form.internalNotes || undefined,
        portalSlug: form.portalSlug || undefined,
        portalSlugEnabled: Boolean(form.portalSlug),
        ...(mode === "create" ? { portalEnabled: form.portalEnabled } : {}),
      };

      if (mode === "create") {
        const result = await createClient(data);
        if (result && typeof result === "object" && "ok" in result && result.ok === false) {
          toast.error(result.error || t("Limit plan tercapai", "Plan limit reached"));
          return;
        }
        toast.success(t("Klien dibuat", "Client created"));
      } else if (defaultValues?.id) {
        await updateClient(defaultValues.id, data);
        toast.success(t("Klien diperbarui", "Client updated"));
      }

      onSuccess?.();
      if (redirectTo) window.location.assign(redirectTo);
      else router.refresh();
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
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function regeneratePortalSlug() {
    if (generatingSlug) return;
    setGeneratingSlug(true);
    try {
      const basis = form.companyName || form.name;
      const result = await generateUniquePortalSlug(basis, defaultValues?.id);
      if (result.ok) {
        set("portalSlug", result.slug);
      } else {
        toast.error(result.error);
      }
    } catch (err: unknown) {
      const msg = isStaleServerActionError(err)
        ? "App baru di-deploy. Refresh halaman, lalu coba lagi."
        : err instanceof Error
          ? err.message
          : t("Gagal membuat slug portal", "Failed to generate portal slug");
      toast.error(msg);
      if (isStaleServerActionError(err)) {
        setTimeout(() => window.location.reload(), 800);
      }
    } finally {
      setGeneratingSlug(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">Identitas</h3>
          <p className="text-xs text-muted-foreground">{t("Nama kontak & perusahaan klien.", "Client contact name & company.")}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">{t("Nama *", "Name *")}</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder={t("Nama kontak klien", "Client contact name")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="companyName">{t("Perusahaan", "Company")}</Label>
            <Input
              id="companyName"
              value={form.companyName}
              onChange={(e) => set("companyName", e.target.value)}
              placeholder={t("Nama perusahaan", "Company name")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t pt-4">
        <div>
          <h3 className="text-sm font-medium">Kontak</h3>
          <p className="text-xs text-muted-foreground">Cara hubungi klien.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="email">{t("Email", "Email")}</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="client@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{t("Telepon", "Phone")}</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+62..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">{t("Website", "Website")}</Label>
            <Input
              id="website"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tags">{t("Tag", "Tags")}</Label>
            <Input
              id="tags"
              value={form.tags}
              onChange={(e) => set("tags", e.target.value)}
              placeholder="branding, web, social"
            />
            <p className="text-[11px] text-muted-foreground">Pisahkan dengan koma.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="address">{t("Alamat", "Address")}</Label>
            <Textarea
              id="address"
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder={t("Alamat lengkap", "Full address")}
              rows={2}
              className="min-h-[72px] resize-y"
            />
          </div>
        </div>
      </section>

      <section className="space-y-3 border-t pt-4">
        <div>
          <h3 className="text-sm font-medium">{t("Catatan internal", "Internal notes")}</h3>
          <p className="text-xs text-muted-foreground">Hanya terlihat di workspace, tidak ke portal klien.</p>
        </div>
        <div className="space-y-1.5">
          <Textarea
            id="internalNotes"
            value={form.internalNotes}
            onChange={(e) => set("internalNotes", e.target.value)}
            placeholder="Preferensi klien, jadwal report, dll."
            rows={3}
            className="min-h-[88px] resize-y"
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border bg-muted/30 p-3 sm:p-4">
        <div>
          <h3 className="text-sm font-medium">Portal klien</h3>
          <p className="text-xs text-muted-foreground">
            Slug tampil di link; token aman tetap wajib untuk membuka portal.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="portalSlug">Slug portal</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="portalSlug"
              value={form.portalSlug}
              onChange={(e) => set("portalSlug", slugify(e.target.value))}
              placeholder="kopi-senja"
            />
            <Button type="button" variant="outline" onClick={regeneratePortalSlug} disabled={generatingSlug} className="shrink-0">
              {generatingSlug ? t("Membuat...", "Generating...") : "Generate"}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">Huruf kecil, angka, dash. Harus unik.</p>
        </div>
        {mode === "create" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.portalEnabled}
              onChange={(e) => set("portalEnabled", e.target.checked)}
            />
            Aktifkan portal sekarang
          </label>
        )}
      </section>

      <div className="sticky bottom-0 -mx-1 border-t bg-background/95 px-1 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")} className="w-full sm:w-auto sm:min-w-40">
          {mode === "create" ? t("Buat Klien", "Create Client") : t("Simpan Perubahan", "Save Changes")}
        </LoadingButton>
      </div>
    </form>
  );
}