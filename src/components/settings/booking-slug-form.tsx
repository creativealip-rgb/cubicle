"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, ExternalLink } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const router = useRouter();
  const [slug, setSlug] = useState(defaultSlug ?? "");
  const [loading, setLoading] = useState(false);

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
      await updateWorkspaceBookingSlug({ bookingSlug: next });
      toast.success(
        next
          ? t("Booking slug disimpan", "Booking slug saved")
          : t("Booking slug dikosongkan", "Booking slug cleared"),
      );
      router.refresh();
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
      toast.success(t("Link disalin", "Link copied"));
    } catch {
      toast.error(t("Gagal salin link", "Failed to copy link"));
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted-foreground">Booking slug</span>
          <span className="font-medium text-right">{defaultSlug || "—"}</span>
        </div>
        {defaultSlug ? (
          <a
            href={`/booking/${defaultSlug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            {t("Buka form booking", "Open booking form")}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t pt-3">
      <div className="space-y-1.5">
        <Label htmlFor="booking-slug">{t("Booking slug", "Booking slug")}</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="booking-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            maxLength={64}
            placeholder="alip-meeting"
            className="font-mono text-sm"
          />
          <Button
            type="submit"
            size="sm"
            disabled={loading || normalizeSlug(slug) === (defaultSlug ?? "")}
            className="sm:shrink-0"
          >
            {loading ? t("Menyimpan…", "Saving…") : t("Simpan slug", "Save slug")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t(
            "Link form publik: /booking/slug-kamu. Kosongkan untuk nonaktifkan.",
            "Public form link: /booking/your-slug. Leave empty to disable.",
          )}
        </p>
      </div>

      {publicUrl ? (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{t("Link form meeting", "Meeting form link")}</p>
            <p className="truncate font-mono text-xs sm:text-sm">{publicUrl}</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={copyLink}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              {t("Salin", "Copy")}
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                {t("Buka", "Open")}
              </a>
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
