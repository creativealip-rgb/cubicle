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
import { Checkbox } from "@/components/ui/checkbox";

const ALL_PLATFORMS = [
  { id: "google_meet", label: "Google Meet" },
  { id: "zoom", label: "Zoom" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "phone", label: "Telepon / WhatsApp Call" },
  { id: "in_person", label: "Tatap Muka Langsung (In-person)" },
  { id: "custom", label: "Custom Link / Lainnya" },
];

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
  defaultAllowedPlatforms = ["google_meet", "zoom", "teams", "phone", "in_person", "custom"],
  canEdit,
}: {
  defaultSlug: string | null;
  defaultPlatform?: string | null;
  defaultLink?: string | null;
  defaultAllowedPlatforms?: string[];
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [customLink, setCustomLink] = useState(defaultLink ?? "");
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>(
    defaultAllowedPlatforms && defaultAllowedPlatforms.length > 0
      ? defaultAllowedPlatforms
      : ["google_meet", "zoom", "teams", "phone", "in_person", "custom"]
  );
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

  function togglePlatform(platformId: string) {
    setAllowedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        if (prev.length <= 1) {
          toast.error(t("Minimal pilih satu opsi platform meeting", "Select at least one meeting platform"));
          return prev;
        }
        return prev.filter((id) => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const next = normalizeSlug(slug);
    setLoading(true);
    try {
      const result = await updateWorkspaceBookingSlug({
        bookingSlug: next,
        bookingMeetingPlatform: (allowedPlatforms[0] as any) || "google_meet",
        bookingMeetingLink: customLink.trim() || undefined,
        bookingAllowedPlatforms: allowedPlatforms,
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

              {/* Opsi Checklist Platform yang Ditampilkan ke Klien */}
              <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                <Label className="text-xs font-semibold block">
                  {t("Opsi Platform Meeting yang Ditampilkan ke Klien", "Allowed Meeting Platforms in Booking Form")}
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  {t("Centang opsi yang ingin Anda sediakan di halaman booking publik:", "Check the options you want to offer on the public booking page:")}
                </p>
                <div className="grid grid-cols-1 gap-2 pt-1">
                  {ALL_PLATFORMS.map((item) => {
                    const isChecked = allowedPlatforms.includes(item.id);
                    return (
                      <label
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-md border bg-background px-3 py-2 text-xs font-medium cursor-pointer hover:bg-muted/40 transition-colors"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => togglePlatform(item.id)}
                        />
                        <span className="select-none">{item.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {(allowedPlatforms.includes("zoom") ||
                allowedPlatforms.includes("teams") ||
                allowedPlatforms.includes("custom")) && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t("Link Ruang Meeting Tetap / Catatan (Opsional)", "Fixed Meeting Room Link / Note (Optional)")}</Label>
                  <Input
                    value={customLink}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://zoom.us/j/... atau https://teams.microsoft.com/..."
                    className="h-9 text-xs"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {t("Link ini akan otomatis disertakan jika klien memilih platform tersebut.", "This link will be included if the client chooses that platform.")}
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
