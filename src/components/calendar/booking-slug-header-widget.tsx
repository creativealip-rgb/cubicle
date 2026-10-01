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
                {t("Pengaturan URL & Slug", "URL & Slug Settings")}
              </DialogTitle>
              <DialogDescription>
                {t(
                  "Tentukan alamat slug unik untuk tautan booking jadwal pertemuan publik Anda.",
                  "Define the unique URL slug for your public appointment booking link."
                )}
              </DialogDescription>
            </DialogHeader>
              <form onSubmit={onSave} className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">{t("Slug URL", "URL Slug")}</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2.5 py-2 rounded-lg border border-border/60 whitespace-nowrap">
                      https://cubiqlo.com/booking/
                    </span>
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={isFreePlan}
                      readOnly={isFreePlan}
                      maxLength={64}
                      placeholder="nama-kamu"
                      className="font-mono text-xs sm:text-sm"
                    />
                  </div>
                  {isFreePlan && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("Upgrade untuk memakai slug / URL kustom.", "Upgrade to use a custom slug / URL.")}{" "}
                      <a href="/app/billing" className="font-medium text-primary underline">{t("Upgrade Plan", "Upgrade Plan")}</a>
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
