"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient, generatePortalToken, checkPortalSlugAvailability, getCurrentUserPlanForPortal, setClientPortalPassword, updateClient, revokePortalToken, revealClientPortalPassword } from "@/lib/actions/clients";
import { isStaleServerActionError } from "@/lib/client-errors";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { useAppTransition } from "@/lib/transition-provider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, Eye, EyeOff, KeyRound, Sparkles, Check, Copy } from "lucide-react";

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
    portalPasswordConfigured?: boolean;
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
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<"idle" | "available" | "taken" | "empty">("idle");
  const [isPaidPlan, setIsPaidPlan] = useState<boolean>(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [revokingPortal, setRevokingPortal] = useState(false);
  const [hasPassword, setHasPassword] = useState(Boolean(defaultValues?.portalPasswordConfigured));
  const [revealingPassword, setRevealingPassword] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(!defaultValues?.portalPasswordConfigured);
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
  const [portalPassword, setPortalPassword] = useState("");

  // Load user plan info on mount
  useEffect(() => {
    getCurrentUserPlanForPortal().then((res) => {
      setIsPaidPlan(res.isPaid);
    }).catch(() => {});
  }, []);

  async function handleRevealPassword() {
    if (!defaultValues?.id) return;
    if (revealedPassword) {
      setRevealedPassword(null);
      return;
    }
    setRevealingPassword(true);
    try {
      const res = await revealClientPortalPassword(defaultValues.id);
      if (res.state === "revealed" && res.password) {
        setRevealedPassword(res.password);
      } else {
        toast.error(t("Password tidak dapat didekripsi / belum tersimpan", "Password cannot be decrypted"));
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal melihat password", "Failed to reveal password"));
    } finally {
      setRevealingPassword(false);
    }
  }

  async function handleCheckSlug() {
    const slug = form.portalSlug.trim();
    if (!slug) {
      setSlugStatus("empty");
      toast.error(t("Masukkan slug URL portal terlebih dahulu", "Please enter a portal URL slug first"));
      return;
    }
    setCheckingSlug(true);
    try {
      const res = await checkPortalSlugAvailability(slug, defaultValues?.id);
      setIsPaidPlan(Boolean(res.isPaid));
      if (res.available) {
        setSlugStatus("available");
        toast.success(t(`URL portal "/portal/${slug}" tersedia!`, `Portal URL "/portal/${slug}" is available!`));
      } else {
        setSlugStatus("taken");
        toast.error(t(`URL portal "/portal/${slug}" sudah dipakai klien lain`, `Portal URL "/portal/${slug}" is already taken`));
      }
    } catch {
      toast.error(t("Gagal mengecek ketersediaan URL", "Failed to check URL availability"));
    } finally {
      setCheckingSlug(false);
    }
  }

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
        ...(form.portalSlug !== (defaultValues?.portalSlug ?? "")
          ? { portalSlugEnabled: Boolean(form.portalSlug) }
          : {}),
        ...(mode === "create" ? { portalEnabled: form.portalEnabled } : {}),
      };

      if (mode === "create") {
        const result = await createClient(data);
        if (result && typeof result === "object" && "ok" in result && result.ok === false) {
          toast.error(result.error || t("Limit plan tercapai", "Plan limit reached"));
          return;
        }
        toast.success(t("Klien dibuat", "Client created"));
        if (stayOnPage) router.refresh();
        onSuccess?.(result.client.id, result.client.name);
        if (!stayOnPage) router.push(`/app/clients/${result.client.id}`);
        return;
      } else if (defaultValues?.id) {
        await updateClient(defaultValues.id, data);
        if (portalPassword.trim()) {
          await generatePortalToken(defaultValues.id);
          await setClientPortalPassword(defaultValues.id, portalPassword);
          setPortalPassword("");
        }
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

  const handleRevokePortal = async () => {
    if (!defaultValues?.id) return;
    if (!window.confirm(t("Cabut akses Client Portal untuk klien ini? Klien tidak akan bisa membuka link portal lagi.", "Revoke Client Portal access for this client? The client will no longer be able to access the portal."))) {
      return;
    }
    setRevokingPortal(true);
    try {
      await revokePortalToken(defaultValues.id);
      set("portalEnabled", false);
      toast.success(t("Akses Client Portal berhasil dicabut", "Client Portal access revoked successfully"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mencabut akses portal", "Failed to revoke portal access"));
    } finally {
      setRevokingPortal(false);
    }
  };

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
        <button
          type="button"
          aria-expanded={showMoreDetails}
          onClick={() => setShowMoreDetails((open) => !open)}
          className="flex w-full items-center justify-between border-t border-slate-100 py-2.5 text-xs font-semibold text-primary hover:underline"
        >
          <span>{t("Detail lainnya (opsional)", "More details (optional)")}</span>
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showMoreDetails ? "rotate-180" : ""}`} />
        </button>
        {showMoreDetails && (
          <div className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="clientNumber" className="text-xs font-medium text-slate-700">Custom Client ID</Label>
                <Input
                  id="clientNumber"
                  value={form.clientNumber}
                  onChange={(e) => set("clientNumber", e.target.value)}
                  placeholder={t("Otomatis jika kosong", "Auto-generated")}
                  className="h-9 rounded-lg bg-white text-xs"
                  maxLength={50}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="website" className="text-xs font-medium text-slate-700">Website</Label>
                <Input
                  id="website"
                  value={form.website}
                  onChange={(e) => set("website", e.target.value)}
                  placeholder="https://..."
                  className="h-9 rounded-lg bg-white text-xs"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-medium text-slate-700">{t("Alamat", "Address")}</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder={t("Alamat lengkap klien...", "Full client address...")}
                rows={2}
                className="min-h-14 resize-none rounded-lg bg-white text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="internalNotes" className="text-xs font-medium text-slate-700">{t("Catatan internal", "Internal notes")}</Label>
              <Textarea
                id="internalNotes"
                value={form.internalNotes}
                onChange={(e) => set("internalNotes", e.target.value)}
                placeholder={t("Preferensi klien, jadwal report, dll.", "Client preferences, reporting schedule, etc.")}
                rows={2}
                className="min-h-16 resize-none rounded-lg bg-white text-xs"
              />
            </div>
          </div>
        )}
        <div className="sticky bottom-0 -mx-1 flex justify-end gap-2 border-t bg-background/95 px-1 pt-3 backdrop-blur"><Button type="button" variant="outline" size="sm" onClick={onCancel}>{t("Batal", "Cancel")}</Button><LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")} className="min-w-36" size="sm">{t("Buat Klien", "Create Client")}</LoadingButton></div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Left Column: Identitas & Kontak */}
        <div data-testid="client-edit-left-column" className="space-y-3">
          <div className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Identitas", "Identity")}</h3>
              <p className="text-[11px] text-muted-foreground">{t("Nama kontak & perusahaan klien.", "Client contact name & company.")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
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
            <div className="space-y-1">
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
            </div>
            <div className="space-y-1">
              <Label htmlFor="address" className="text-xs font-medium">{t("Alamat", "Address")}</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder={t("Alamat lengkap", "Full address")}
                rows={2}
                className="min-h-[64px] resize-none text-xs"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Catatan Internal & Portal Klien */}
        <div data-testid="client-edit-right-column" className="space-y-3">
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
                rows={3}
                className="min-h-[76px] resize-none text-xs"
              />
            </div>
          </div>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("Portal Klien", "Client Portal")}</h3>
                <p className="text-[11px] text-muted-foreground">
                  {isPaidPlan
                    ? t("Slug kustom portal klien.", "Custom portal URL slug.")
                    : t("Tautan akses portal klien Anda.", "Access link for your client portal.")}
                </p>
              </div>
              {form.portalEnabled && defaultValues?.id && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleRevokePortal}
                  disabled={revokingPortal}
                  className="h-7 text-xs font-semibold shrink-0"
                >
                  {revokingPortal ? t("Mencabut...", "Revoking...") : t("Cabut Akses", "Revoke Access")}
                </Button>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="portalSlug" className="text-xs font-medium">{t("Slug Portal", "Portal Slug")}</Label>
              <div className="flex gap-2">
                <Input
                  id="portalSlug"
                  value={form.portalSlug}
                  onChange={(e) => {
                    const clean = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                    set("portalSlug", clean);
                    setSlugStatus("idle");
                  }}
                  disabled={!isPaidPlan}
                  readOnly={!isPaidPlan}
                  placeholder="your-url"
                  className="h-9 text-sm font-mono"
                />
                {isPaidPlan ? (
                  <Button type="button" variant="outline" size="sm" onClick={handleCheckSlug} disabled={checkingSlug || !form.portalSlug.trim()} className="shrink-0 h-9 font-medium">
                    {checkingSlug ? t("Memeriksa...", "Checking...") : t("Cek URL", "Check URL")}
                  </Button>
                ) : null}
              </div>
              {isPaidPlan && slugStatus === "available" && (
                <p className="text-[11px] font-medium text-emerald-600">
                  {t(`✓ URL portal "/portal/${form.portalSlug}" tersedia untuk digunakan.`, `✓ Portal URL "/portal/${form.portalSlug}" is available.`)}
                </p>
              )}
              {isPaidPlan && slugStatus === "taken" && (
                <p className="text-[11px] font-medium text-destructive">
                  {t(`✕ URL portal "/portal/${form.portalSlug}" sudah digunakan oleh klien lain.`, `✕ Portal URL "/portal/${form.portalSlug}" is already taken.`)}
                </p>
              )}
              {!isPaidPlan && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t("Upgrade untuk memakai slug / URL kustom.", "Upgrade to use a custom slug / URL.")}{" "}
                  <a href="/app/billing" className="font-medium text-primary underline">{t("Upgrade Plan", "Upgrade Plan")}</a>
                </p>
              )}
            </div>
            {/* Password Management */}
            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">{t("Password Portal", "Portal Password")}</Label>
                {hasPassword && !showChangePassword && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangePassword(true)}
                    className="h-6 text-[11px] px-2 font-medium text-primary hover:text-primary"
                  >
                    {t("Ganti Password", "Change Password")}
                  </Button>
                )}
              </div>

              {hasPassword && !showChangePassword ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-border/80 bg-background p-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="font-mono text-xs truncate">
                      {revealedPassword ? revealedPassword : "••••••••••••"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {revealedPassword && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(revealedPassword);
                          toast.success(t("Password disalin!", "Password copied!"));
                        }}
                        title={t("Salin Password", "Copy Password")}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1 px-2 font-medium"
                      disabled={revealingPassword}
                      onClick={handleRevealPassword}
                    >
                      {revealedPassword ? (
                        <>
                          <EyeOff className="h-3 w-3" /> {t("Sembunyikan", "Hide")}
                        </>
                      ) : (
                        <>
                          <Eye className="h-3 w-3" /> {revealingPassword ? t("Membuka...", "Revealing...") : t("Lihat Password", "View Password")}
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="relative">
                    <Input
                      id="portalPassword"
                      type="password"
                      minLength={8}
                      value={portalPassword}
                      onChange={(e) => setPortalPassword(e.target.value)}
                      placeholder={hasPassword ? t("Masukkan password baru (min. 8 karakter)", "Enter new password (min. 8 chars)") : t("Buat password portal (min. 8 karakter)", "Create portal password (min. 8 chars)")}
                      className="h-9 text-sm"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{t("Minimal 8 karakter.", "At least 8 characters.")}</span>
                    {hasPassword && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          setPortalPassword("");
                        }}
                        className="text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        {t("Batal ubah", "Cancel change")}
                      </button>
                    )}
                  </div>
                </div>
              )}
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
