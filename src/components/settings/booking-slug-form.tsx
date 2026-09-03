"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Copy, ExternalLink, Link2, Check } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/i18n-client";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function BookingSlugForm({
  defaultSlug,
  canEdit,
}: {
  defaultSlug: string | null;
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const publicUrl = useMemo(() => {
    const clean = normalizeSlug(slug);
    if (!clean) return null;
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : process.env.NEXT_PUBLIC_APP_URL || "https://cubiqlo.com";
    return `${origin}/booking/${clean}`;
  }, [slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    const next = normalizeSlug(slug);
    if (next === (defaultSlug ?? "")) {
      toast.message(t("Tidak ada perubahan", "No changes"));
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
      toast.success(t("Link disalin ke clipboard", "Link copied to clipboard"));
    } catch {
      toast.error(t("Gagal salin link", "Failed to copy link"));
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">{t("Booking slug", "Booking slug")}</span>
          <span className="font-medium text-right">{defaultSlug || "—"}</span>
        </div>
        {defaultSlug ? (
          <a
            href={`/booking/${defaultSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            {t("Buka form booking", "Open booking form")}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="rounded-xl border shadow-none bg-card">
      <CardContent className="p-3.5 space-y-3">
        <form onSubmit={onSubmit} className="space-y-2.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="booking-slug" className="text-xs font-semibold flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5 text-primary" />
              {t("Booking Slug & Link Publik", "Booking Slug & Public Link")}
            </Label>
            {defaultSlug && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono select-none">
                /booking/
              </span>
              <Input
                id="booking-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                maxLength={64}
                placeholder="your-name"
                className="h-8 pl-[4.5rem] font-mono text-xs"
              />
            </div>
            <LoadingButton
              type="submit"
              size="sm"
              loading={loading}
              disabled={normalizeSlug(slug) === (defaultSlug ?? "")}
              className="h-8 px-3 text-xs shrink-0"
            >
              {t("Simpan", "Save")}
            </LoadingButton>
          </div>
        </form>

        {publicUrl ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-border/80 bg-muted/20 p-2 text-xs">
            <p className="truncate font-mono text-[11px] text-muted-foreground min-w-0">
              {publicUrl}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 hover:bg-background"
                onClick={copyLink}
              >
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? t("Tersalin", "Copied") : t("Salin", "Copy")}</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs gap-1 hover:bg-background"
                asChild
              >
                <a href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3 w-3" />
                  <span>{t("Buka", "Open")}</span>
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            {t(
              "Masukkan slug untuk mengaktifkan halaman penjadwalan mandiri klien.",
              "Enter a slug to activate client self-scheduling.",
            )}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
