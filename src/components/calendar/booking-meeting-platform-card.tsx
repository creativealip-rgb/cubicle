"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Video, Check, Loader2 } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/lib/i18n-client";

const ALL_PLATFORMS = [
  { id: "google_meet", label: "Google Meet" },
  { id: "zoom", label: "Zoom" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "phone", label: "Phone / WhatsApp Call" },
  { id: "in_person", label: "In-Person Meeting" },
  { id: "custom", label: "Custom Link / Other" },
];

export function BookingMeetingPlatformCard({
  defaultPlatform = "google_meet",
  defaultLink = "",
  defaultAllowedPlatforms = ["google_meet", "zoom", "teams", "phone", "in_person", "custom"],
  bookingSlug,
  canEdit,
}: {
  defaultPlatform?: string | null;
  defaultLink?: string | null;
  defaultAllowedPlatforms?: string[];
  bookingSlug?: string | null;
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [customLink, setCustomLink] = useState(defaultLink ?? "");
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>(
    defaultAllowedPlatforms && defaultAllowedPlatforms.length > 0
      ? defaultAllowedPlatforms
      : ["google_meet", "zoom", "teams", "phone", "in_person", "custom"]
  );
  const [saving, setSaving] = useState(false);

  function togglePlatform(platformId: string) {
    if (!canEdit) return;
    setAllowedPlatforms((prev) => {
      if (prev.includes(platformId)) {
        if (prev.length <= 1) {
          toast.error(t("Pilih minimal satu opsi platform meeting", "Select at least one meeting platform"));
          return prev;
        }
        return prev.filter((id) => id !== platformId);
      } else {
        return [...prev, platformId];
      }
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit || saving) return;
    setSaving(true);
    try {
      const result = await updateWorkspaceBookingSlug({
        bookingSlug: bookingSlug ?? "",
        bookingMeetingPlatform: (allowedPlatforms[0] as any) || "google_meet",
        bookingMeetingLink: customLink.trim() || undefined,
        bookingAllowedPlatforms: allowedPlatforms,
      });
      if ("error" in result) {
        toast.error(t("Gagal menyimpan platform meeting", "Failed to save meeting platforms"));
        return;
      }
      toast.success(t("Platform meeting berhasil disimpan", "Meeting platforms saved successfully"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menyimpan", "Save failed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-xl border shadow-none bg-card mt-4">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          <Video className="h-4 w-4 text-primary" />
          {t("Platform Meeting", "Meeting Platform Options")}
        </CardTitle>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {t(
            "Pilih opsi platform pertemuan yang dapat dipilih klien saat booking.",
            "Choose meeting platform options that clients can select during booking."
          )}
        </p>
      </CardHeader>
      <CardContent className="p-3.5 space-y-3">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ALL_PLATFORMS.map((item) => {
              const isChecked = allowedPlatforms.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                    isChecked
                      ? "bg-primary/5 border-primary/40 text-foreground"
                      : "bg-background border-border/70 text-muted-foreground"
                  } ${canEdit ? "cursor-pointer hover:bg-muted/40" : "opacity-70 cursor-not-allowed"}`}
                >
                  <Checkbox
                    checked={isChecked}
                    disabled={!canEdit}
                    onCheckedChange={() => togglePlatform(item.id)}
                  />
                  <span className="select-none truncate text-[11px] font-semibold">{item.label}</span>
                </label>
              );
            })}
          </div>

          {(allowedPlatforms.includes("zoom") ||
            allowedPlatforms.includes("teams") ||
            allowedPlatforms.includes("custom")) && (
            <div className="space-y-1.5 pt-1">
              <Label className="text-[11px] font-semibold text-muted-foreground">
                {t("Link Ruang Meeting / Catatan (Opsional)", "Fixed Meeting Room Link / Note (Optional)")}
              </Label>
              <Input
                value={customLink}
                disabled={!canEdit}
                onChange={(e) => setCustomLink(e.target.value)}
                placeholder="https://zoom.us/j/... / https://teams.microsoft.com/..."
                className="h-8 text-xs font-mono"
              />
            </div>
          )}

          {canEdit && (
            <div className="flex justify-end pt-1">
              <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs font-semibold px-3">
                {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                {t("Simpan Platform", "Save Platforms")}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
