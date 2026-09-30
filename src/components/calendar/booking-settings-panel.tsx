"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Clock, Video, Check, Loader2, Plus, Globe } from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState } from "@/components/empty-state";
import { AvailabilityRuleForm } from "@/components/calendar/availability-rule-form";
import { DeleteAvailabilityRuleButton } from "@/components/calendar/calendar-item-actions";
import { useT } from "@/lib/i18n-client";

export interface AvailabilityRuleItem {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

const ALL_PLATFORMS = [
  { id: "google_meet", label: "Google Meet" },
  { id: "zoom", label: "Zoom" },
  { id: "teams", label: "Microsoft Teams" },
  { id: "phone", label: "Phone / WhatsApp Call" },
  { id: "in_person", label: "In-Person Meeting" },
  { id: "custom", label: "Custom Link / Other" },
];

export function BookingSettingsPanel({
  rules,
  dayNames,
  dayShortNames,
  defaultPlatform = "google_meet",
  defaultLink = "",
  defaultAllowedPlatforms = ["google_meet", "zoom", "teams", "phone", "in_person", "custom"],
  bookingSlug,
  canEdit,
}: {
  rules: AvailabilityRuleItem[];
  dayNames: string[];
  dayShortNames: string[];
  defaultPlatform?: string | null;
  defaultLink?: string | null;
  defaultAllowedPlatforms?: string[];
  bookingSlug?: string | null;
  canEdit: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [activeTab, setActiveTab] = useState<"hours" | "platforms">("hours");

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

  async function handleSavePlatforms(e: React.FormEvent) {
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
    <Card className="rounded-xl border shadow-none bg-card flex flex-col h-full">
      <CardHeader className="pb-3 border-b space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
            {activeTab === "hours" ? (
              <Clock className="h-4 w-4 text-primary" />
            ) : (
              <Video className="h-4 w-4 text-primary" />
            )}
            {t("Konfigurasi Jadwal", "Booking Configuration")}
          </CardTitle>
          {activeTab === "hours" && canEdit && <AvailabilityRuleForm />}
        </div>

        {/* Minimal Segmented Tab Switcher */}
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5 border border-border/60 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all ${
              activeTab === "hours"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3 w-3" />
            <span>{t("Jam Kerja", "Working Hours")} ({rules.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("platforms")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-md py-1 text-xs font-medium transition-all ${
              activeTab === "platforms"
                ? "bg-background text-foreground shadow-2xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="h-3 w-3" />
            <span>{t("Platform Meeting", "Platforms")} ({allowedPlatforms.length})</span>
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 flex-1 flex flex-col">
        {activeTab === "hours" ? (
          /* TAB 1: WORKING HOURS / AVAILABILITY RULES */
          <div className="space-y-2 flex-1 flex flex-col">
            {rules.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-6">
                <EmptyState
                  icon={Clock}
                  title={t("Belum ada jam kerja aktif", "No working hours set")}
                  description={t(
                    "Tambah aturan untuk menentukan jadwal ketersediaan kamu",
                    "Add rules to define when you're available for client bookings"
                  )}
                  embedded
                />
              </div>
            ) : (
              <div className="divide-y divide-border/60 -mx-3.5 px-3.5">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-2.5 py-2.5 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex h-7 w-10 items-center justify-center rounded-md bg-primary/10 text-primary font-bold text-xs uppercase shrink-0">
                        {dayShortNames[rule.dayOfWeek]}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground leading-tight">
                          {dayNames[rule.dayOfWeek]}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                          {rule.startTime.substring(0, 5)} – {rule.endTime.substring(0, 5)}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <DeleteAvailabilityRuleButton
                        id={rule.id}
                        label={`${dayNames[rule.dayOfWeek]} ${rule.startTime.substring(0, 5)}–${rule.endTime.substring(0, 5)}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MEETING PLATFORMS */
          <form onSubmit={handleSavePlatforms} className="space-y-3.5 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Pilih platform pertemuan yang ingin Anda tawarkan ke klien pada link booking publik:",
                  "Select which platforms clients can choose from on your booking link:"
                )}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ALL_PLATFORMS.map((item) => {
                  const isChecked = allowedPlatforms.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors ${
                        isChecked
                          ? "bg-primary/5 border-primary/40 text-foreground font-semibold"
                          : "bg-background border-border/70 text-muted-foreground"
                      } ${canEdit ? "cursor-pointer hover:bg-muted/40" : "opacity-70 cursor-not-allowed"}`}
                    >
                      <Checkbox
                        checked={isChecked}
                        disabled={!canEdit}
                        onCheckedChange={() => togglePlatform(item.id)}
                      />
                      <span className="select-none truncate text-[11px]">{item.label}</span>
                    </label>
                  );
                })}
              </div>

              {(allowedPlatforms.includes("zoom") ||
                allowedPlatforms.includes("teams") ||
                allowedPlatforms.includes("custom")) && (
                <div className="space-y-1.5 pt-1">
                  <Label className="text-[11px] font-semibold text-muted-foreground">
                    {t("Link Ruang Meeting Tetap / Catatan (Opsional)", "Fixed Meeting Room Link / Note (Optional)")}
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
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2 border-t mt-auto">
                <Button type="submit" size="sm" disabled={saving} className="h-7 text-xs font-semibold px-3">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Check className="h-3 w-3 mr-1.5" />}
                  {t("Simpan Opsi Platform", "Save Platform Options")}
                </Button>
              </div>
            )}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
