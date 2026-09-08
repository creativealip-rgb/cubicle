"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, generateUniquePortalSlug, updateClient } from "@/lib/actions/clients";
import { isStaleServerActionError } from "@/lib/client-errors";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAppTransition } from "@/lib/transition-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown } from "lucide-react";

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
  onSuccess?: (id?: string, name?: string) => void;
  redirectTo?: string;
  stayOnPage?: boolean;
  onCancel?: () => void;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function ClientForm({ mode, defaultValues, onSuccess, redirectTo, stayOnPage = false, onCancel }: ClientFormProps) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);
  const [generatingSlug, setGeneratingSlug] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [form, setForm] = useState({
    clientNumber: defaultValues?.clientNumber ?? "",
    name: defaultValues?.name ?? "",
    companyName: defaultValues?.companyName ?? "",
    email: defaultValues?.email ?? "",
    phone: defaultValues?.phone ?? "",
    website: defaultValues?.website ?? "",
    address: defaultValues?.address ?? "",
    tags: defaultValues?.tags?.join(", ") ?? "",
    internalNotes: defaultValues?.internalNotes ?? "",
    portalSlug: defaultValues?.portalSlug ?? "",
    portalEnabled: defaultValues?.portalEnabled ?? false,
  });

  async function handleSave() {
    if (loading) return;
    const name = form.name.trim();
    if (!name) {
      toast.error(t("Nama klien wajib diisi", "Client name is required"));
      return;
    }
    setLoading(true);
    try {
      const data = {
        clientNumber: form.clientNumber || undefined,
        name,
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
        onSuccess?.(result.client.id, result.client.name);
        if (!stayOnPage) router.push(`/app/clients/${result.client.id}`);
        return;
      } else if (defaultValues?.id) {
        await updateClient(defaultValues.id, data);
        toast.success(t("Klien diperbarui", "Client updated"));
      }

      onSuccess?.();
      if (redirectTo) window.location.assign(redirectTo);
      else refresh();
    } catch (err: unknown) {
      const msg = isStaleServerActionError(err)
        ? "App baru di-deploy. Refresh halaman, lalu coba lagi."
        : err instanceof Error
          ? err.message
          : "Terjadi kesalahan";
      toast.error(msg);
      if (isStaleServerActionError(err)) {
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

  if (mode === "create") {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1"><Label htmlFor="name" className="text-sm font-medium">{t("Nama klien *", "Client name *")}</Label><Input id="name" autoFocus required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder={t("Nama klien", "Client name")} className="h-10 text-sm" /></div>
          <div className="space-y-1"><Label htmlFor="companyName" className="text-sm font-medium">{t("Perusahaan", "Company")}</Label><Input id="companyName" value={form.companyName} onChange={(e) => set("companyName", e.target.value)} placeholder={t("Nama perusahaan", "Company name")} className="h-10 text-sm" /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="email" className="text-sm font-medium">Email</Label><Input id="email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="client@example.com" className="h-10 text-sm" /></div>
            <div className="space-y-1"><Label htmlFor="phone" className="text-sm font-medium">{t("Telepon", "Phone")}</Label><Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+62..." className="h-10 text-sm" /></div>
          </div>
        </div>
        <button type="button" aria-expanded={showMoreDetails} onClick={() => setShowMoreDetails((open) => !open)} className="flex w-full items-center justify-between border-t py-3 text-sm font-medium text-primary">{t("Detail lainnya", "More details")}<ChevronDown className={`h-4 w-4 transition-transform ${showMoreDetails ? "rotate-180" : ""}`} /></button>
        {showMoreDetails && <div className="space-y-3 rounded-lg bg-muted/30 p-3">
          <div className="space-y-1"><Label htmlFor="clientNumber" className="text-xs font-medium">Custom Client ID</Label><Input id="clientNumber" value={form.clientNumber} onChange={(e) => set("clientNumber", e.target.value)} placeholder={t("Otomatis jika kosong", "Auto-generated if empty")} className="h-9 text-sm" maxLength={50} /><p className="text-[11px] text-muted-foreground">{t("Kosongkan untuk membuat ID otomatis.", "Leave empty to generate automatically.")}</p></div>
          <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1"><Label htmlFor="website" className="text-xs font-medium">Website</Label><Input id="website" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." className="h-9 text-sm" /></div><div className="space-y-1"><Label htmlFor="tags" className="text-xs font-medium">{t("Tag", "Tags")}</Label><Input id="tags" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="web, branding" className="h-9 text-sm" /></div></div>
          <div className="space-y-1"><Label htmlFor="address" className="text-xs font-medium">{t("Alamat", "Address")}</Label><Textarea id="address" value={form.address} onChange={(e) => set("address", e.target.value)} placeholder={t("Alamat lengkap", "Full address")} rows={2} className="min-h-16 resize-y text-sm" /></div>
          <div className="space-y-1"><Label htmlFor="internalNotes" className="text-xs font-medium">{t("Catatan internal", "Internal notes")}</Label><Textarea id="internalNotes" value={form.internalNotes} onChange={(e) => set("internalNotes", e.target.value)} placeholder={t("Preferensi klien, jadwal report, dll.", "Client preferences, reporting schedule, etc.")} rows={3} className="min-h-20 resize-y text-sm" /></div>
        </div>}
        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t bg-background/95 px-1 pt-3 backdrop-blur"><Button type="button" variant="outline" size="sm" onClick={onCancel}>{t("Batal", "Cancel")}</Button><LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")} className="min-w-36" size="sm">{t("Buat Klien", "Create Client")}</LoadingButton></div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Left Column: Identitas & Kontak */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Identitas", "Identity")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("Nama kontak & perusahaan klien.", "Client contact name & company.")}</p>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <Label htmlFor="clientNumber" className="text-xs font-medium">Custom Client ID</Label>
                <Input id="clientNumber" value={form.clientNumber} onChange={(e) => set("clientNumber", e.target.value)} placeholder={t("Otomatis jika kosong", "Auto-generated if empty")} className="h-9 text-sm" maxLength={50} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name" className="text-xs font-medium">{t("Nama *", "Name *")}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  required
                  placeholder={t("Nama kontak klien", "Client contact name")}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="companyName" className="text-xs font-medium">{t("Perusahaan", "Company")}</Label>
                <Input
                  id="companyName"
                  value={form.companyName}
                  onChange={(e) => set("companyName", e.target.value)}
                  placeholder={t("Nama perusahaan", "Company name")}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t pt-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Kontak", "Contact")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("Cara hubungi klien.", "How to contact the client.")}</p>
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs font-medium">{t("Email", "Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="client@example.com"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone" className="text-xs font-medium">{t("Telepon", "Phone")}</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+62..."
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-2 grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="website" className="text-xs font-medium">{t("Website", "Website")}</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://..."
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="tags" className="text-xs font-medium">{t("Tag", "Tags")}</Label>
                <Input
                  id="tags"
                  value={form.tags}
                  onChange={(e) => set("tags", e.target.value)}
                  placeholder="web, branding"
                  className="h-9 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-medium">{t("Alamat", "Address")}</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder={t("Alamat lengkap", "Full address")}
                rows={2}
                className="min-h-[64px] resize-y text-xs"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Catatan Internal & Portal Klien */}
        <div className="space-y-4">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Catatan Internal", "Internal Notes")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("Hanya terlihat di workspace, bukan ke klien.", "Visible only in workspace, not client.")}</p>
            </div>
            <div className="space-y-1">
              <Textarea
                id="internalNotes"
                value={form.internalNotes}
                onChange={(e) => set("internalNotes", e.target.value)}
                placeholder={t("Preferensi klien, jadwal report, dll.", "Client preferences, reporting schedule, etc.")}
                rows={4}
                className="min-h-[110px] resize-y text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Portal Klien", "Client Portal")}</h3>
              <p className="text-[11px] text-muted-foreground">
                {t("Slug kustom portal klien.", "Custom portal URL slug.")}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portalSlug" className="text-xs font-medium">{t("Slug Portal", "Portal Slug")}</Label>
              <div className="flex gap-2">
                <Input
                  id="portalSlug"
                  value={form.portalSlug}
                  onChange={(e) => set("portalSlug", slugify(e.target.value))}
                  placeholder="kopi-senja"
                  className="h-9 text-sm"
                />
                <Button type="button" variant="outline" size="sm" onClick={regeneratePortalSlug} disabled={generatingSlug} className="shrink-0 h-9">
                  {generatingSlug ? t("...", "...") : "Generate"}
                </Button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t bg-background/95 px-1 pt-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")} className="w-full sm:w-auto sm:min-w-36" size="sm">
          {t("Simpan Perubahan", "Save Changes")}
        </LoadingButton>
      </div>
    </form>
  );
}
