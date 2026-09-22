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

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  defaultPlatform = "google_meet",
  defaultLink = "",
  canEdit,
}: {
  defaultSlug: string | null;
  defaultPlatform?: string | null;
  defaultLink?: string | null;
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [platform, setPlatform] = useState(defaultPlatform ?? "google_meet");
  const [customLink, setCustomLink] = useState(defaultLink ?? "");
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
    const next = normalizeSlug(slug);
    setLoading(true);
    try {
      const result = await updateWorkspaceBookingSlug({
        bookingSlug: next,
        bookingMeetingPlatform: platform as any,
        bookingMeetingLink: customLink.trim() || undefined,
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
          <DialogContent className="sm:max-w-md">
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
                <Label className="text-xs font-semibold">{t("Booking URL Slug", "Booking URL Slug")}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground select-none">
                    /booking/
                  </span>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    maxLength={64}
                    placeholder="nama-kamu"
                    className="h-9 pl-[4.5rem] font-mono text-sm"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {t("Hanya huruf kecil, angka, dan tanda hubung (-).", "Lowercase letters, numbers, and dashes (-) only.")}
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">{t("Platform Meeting Default", "Default Meeting Platform")}</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder={t("Pilih platform", "Select platform")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google_meet">Google Meet</SelectItem>
                    <SelectItem value="zoom">Zoom</SelectItem>
                    <SelectItem value="teams">Microsoft Teams</SelectItem>
                    <SelectItem value="phone">{t("Telepon / WhatsApp Call", "Phone / WhatsApp Call")}</SelectItem>
                    <SelectItem value="in_person">{t("Tatap Muka Langsung (In-person)", "In-person Meeting")}</SelectItem>
                    <SelectItem value="custom">{t("Custom Link / Lainnya", "Custom Link / Other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(platform === "zoom" || platform === "teams" || platform === "custom") && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("Link Ruang Meeting / Catatan", "Meeting Room Link / Note")}</Label>
                  <Input
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://zoom.us/j/... atau https://teams.microsoft.com/..."
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("Link ini akan otomatis ditampilkan kepada klien setelah booking.", "This link will be shown to clients upon booking.")}
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={loading}>
                  {t("Batal", "Cancel")}
                </Button>
                <LoadingButton type="submit" size="sm" loading={loading} className="font-semibold">
                  {t("Simpan Slug", "Save Slug")}
                </LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
