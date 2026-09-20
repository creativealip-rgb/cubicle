"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, Check, Settings2, Globe } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

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
  canEdit,
}: {
  defaultSlug: string | null;
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
    const next = normalizeSlug(slug);
    if (next === (defaultSlug ?? "")) {
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const result = await updateWorkspaceBookingSlug({ bookingSlug: next });
      if ("error" in result) {
        toast.error(t("Booking slug sudah dipakai workspace lain", "Booking slug is already used by another workspace"));
        return;
      }
      toast.success(
        next
          ? t("Booking slug disimpan", "Booking slug saved")
          : t("Booking slug dikosongkan", "Booking slug cleared"),
      );
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
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-1 text-xs shadow-2xs">
          <Globe className="h-3.5 w-3.5 text-primary" />
          <span className="font-mono text-muted-foreground hidden md:inline">/booking/</span>
          <span className="font-mono font-semibold text-foreground">{defaultSlug}</span>
          <button
            type="button"
            onClick={copyLink}
            className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-primary hover:bg-muted transition-colors"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
            <span>{copied ? t("Tersalin", "Copied") : t("Salin", "Copy")}</span>
          </button>
          <Button variant="ghost" size="icon" className="h-6 w-6" asChild>
            <a href={publicUrl} target="_blank" rel="noreferrer" title={t("Buka halaman booking", "Open booking page")}>
              <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </a>
          </Button>
        </div>
      ) : null}

      {canEdit && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant={publicUrl ? "outline" : "default"}
              size="sm"
              className="h-8 gap-1.5 text-xs font-semibold"
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
