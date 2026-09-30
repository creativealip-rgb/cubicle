"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, Check, Settings2 } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";
import { Label } from "@/components/ui/label";


function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BookingSlugHeaderWidget({
  defaultSlug,
  isFreePlan = false,
  canEdit,
}: {
  defaultSlug: string | null;
  isFreePlan?: boolean;
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(defaultSlug ?? "");

  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    const clean = normalizeSlug(defaultSlug ?? "");
    if (!clean) return null;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://cubiqlo.com";
    return `${origin}/booking/${clean}`;
  }, [defaultSlug]);



  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    if (isFreePlan) {
      toast.error(t("Upgrade ke Solo atau Team untuk kustomisasi URL slug booking", "Upgrade to Solo or Team to customize your booking URL slug"));
      return;
    }
    const next = normalizeSlug(slug);
    setLoading(true);
    try {
      const result = await updateWorkspaceBookingSlug({
        bookingSlug: next,
      });
      if ("error" in result) {
        toast.error(t("Booking slug sudah dipakai workspace lain", "Booking slug is already used by another workspace"));
        return;
      }
      toast.success(t("Pengaturan booking disimpan", "Booking settings saved"));
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal simpan", "Save failed"));
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(t("Link booking disalin ke clipboard", "Booking link copied to clipboard"));
    } catch {
      toast.error(t("Gagal salin link", "Failed to copy link"));
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {publicUrl ? (
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
            onClick={copyLink}
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? t("Tersalin", "Copied") : t("Salin Link", "Copy Link")}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-semibold"
            asChild
          >
            <a href={publicUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t("Buka Link", "Open Link")}</span>
            </a>
          </Button>
        </>
      ) : null}

      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant={publicUrl ? "ghost" : "default"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold border border-border/80 hover:bg-muted/80"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>{defaultSlug ? t("Atur Slug", "Edit Slug") : t("Aktifkan Link Booking", "Set Booking Slug")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                {t("Pengaturan Booking Slug", "Booking Slug Settings")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "Tentukan tautan URL publik agar klien dapat memilih jadwal pertemuan secara mandiri.",
                  "Set your public URL link so clients can schedule appointments with you directly."
                )}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSave} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">{t("Booking URL Slug", "Booking URL Slug")}</Label>
                  {isFreePlan && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                      {t("Free Plan: Random Slug", "Free Plan: Random Slug")}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none">
                    /booking/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={isFreePlan}
                    maxLength={64}
                    placeholder="nama-kamu"
                    className="h-9 pl-[4.5rem] font-mono text-sm disabled:opacity-75 disabled:bg-muted/40"
                  />
                </div>
                {isFreePlan ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 text-xs text-muted-foreground">
                    <p className="font-semibold text-amber-800 dark:text-amber-400">
                      {t("Kustomisasi Slug Eksklusif Paket Solo / Team", "Slug Customization Exclusive to Solo & Team")}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-relaxed">
                      {t(
                        "Pengguna Free Plan menggunakan tautan acak otomatis. Upgrade akun Anda ke paket Solo atau Team untuk membuat URL booking kustom yang profesional (misal: /booking/nama-anda).",
                        "Free Plan uses an automated random link. Upgrade your workspace to Solo or Team to unlock clean, customized booking links (e.g. /booking/your-brand)."
                      )}
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    {t("Hanya huruf kecil, angka, dan tanda hubung (-).", "Lowercase letters, numbers, and dashes (-) only.")}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
                  {t("Batal", "Cancel")}
                </Button>
                {isFreePlan ? (
                  <Button size="sm" className="font-semibold" asChild>
                    <a href="/app/billing">{t("Upgrade Plan", "Upgrade Plan")}</a>
                  </Button>
                ) : (
                  <LoadingButton type="submit" size="sm" loading={loading} className="font-semibold">
                    {t("Simpan Slug", "Save Slug")}
                  </LoadingButton>
                )}
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
