"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import {
  Clock,
  Video,
  Check,
  Loader2,
  Globe,
  Phone,
  Users,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const PLATFORM_CONFIGS = [
  {
    id: "google_meet",
    label: "Google Meet",
    desc: "Auto-generate video link",
    icon: Video,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "zoom",
    label: "Zoom",
    desc: "Direct meeting link",
    icon: Video,
    color: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "teams",
    label: "Microsoft Teams",
    desc: "Teams meeting",
    icon: Video,
    color: "text-indigo-600 bg-indigo-500/10 border-indigo-500/20",
  },
  {
    id: "phone",
    label: "Phone / WhatsApp",
    desc: "Audio call direct",
    icon: Phone,
    color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  },
  {
    id: "in_person",
    label: "In-Person Meeting",
    desc: "Offline face-to-face",
    icon: Users,
    color: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  },
  {
    id: "custom",
    label: "Custom Link / Other",
    desc: "Custom room URL",
    icon: LinkIcon,
    color: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  },
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

  // Group rules by Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const groupedRules = useMemo(() => {
    const map = new Map<number, AvailabilityRuleItem[]>();
    for (const rule of rules) {
      const existing = map.get(rule.dayOfWeek) ?? [];
      existing.push(rule);
      map.set(rule.dayOfWeek, existing);
    }
    // Sort slots inside each day chronologically
    map.forEach((slots) => {
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    // Return as array sorted by day (Monday first or Sunday first based on index)
    return Array.from(map.entries()).sort(([dayA], [dayB]) => {
      // Put Monday (1) to Saturday (6) then Sunday (0) at end, or standard 0-6
      const adjustedA = dayA === 0 ? 7 : dayA;
      const adjustedB = dayB === 0 ? 7 : dayB;
      return adjustedA - adjustedB;
    });
  }, [rules]);
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
    <Card className="rounded-2xl border shadow-none bg-card flex flex-col h-full overflow-hidden">
      {/* Header with Linear-style Navigation Tab Bar */}
      <div className="border-b bg-muted/20 px-4 pt-3 pb-0">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("Pengaturan Sesi", "Session Setup")}
            </h3>
            <p className="text-sm font-semibold text-foreground">
              {activeTab === "hours" ? t("Jadwal Jam Kerja", "Availability & Hours") : t("Pilihan Platform", "Meeting Platforms")}
            </p>
          </div>
          {activeTab === "hours" && canEdit && <AvailabilityRuleForm />}
        </div>

        {/* Clean Pill Sub-Nav (Linear/Cal.com style) */}
        <div className="flex items-center gap-2 border-b border-transparent -mb-px">
          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`flex items-center gap-1.5 pb-2.5 px-1 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "hours"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{t("Jam Kerja", "Working Hours")}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
              {rules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("platforms")}
            className={`flex items-center gap-1.5 pb-2.5 px-1 text-xs font-semibold transition-all border-b-2 cursor-pointer ${
              activeTab === "platforms"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className="h-3.5 w-3.5" />
            <span>{t("Platform", "Platforms")}</span>
            <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] font-mono text-muted-foreground">
              {allowedPlatforms.length}
            </span>
          </button>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        {activeTab === "hours" ? (
          /* TAB 1: WORKING HOURS */
          <div className="space-y-2 flex-1 flex flex-col">
            {rules.length === 0 ? (
              <div className="flex flex-1 items-center justify-center py-8">
                <EmptyState
                  icon={Clock}
                  title={t("Belum ada jam kerja aktif", "No working hours set")}
                  description={t(
                    "Tambah aturan untuk menentukan kapan kamu bersedia menerima booking klien",
                    "Add rules to define when you're available for client bookings"
                  )}
                  embedded
                />
              </div>
            ) : (
              <div className="space-y-2 flex-1">
                {groupedRules.map(([dayIndex, daySlots]) => (
                  <div
                    key={`day-${dayIndex}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card hover:border-border transition-colors"
                  >
                    {/* Day Badge & Name */}
                    <div className="flex items-center gap-2.5 min-w-[120px] shrink-0">
                      <div className="flex h-7 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs uppercase shrink-0">
                        {dayShortNames[dayIndex]}
                      </div>
                      <span className="text-xs font-semibold text-foreground">
                        {dayNames[dayIndex]}
                      </span>
                    </div>

                    {/* Multi-Slot Time Chips Group */}
                    <div className="flex flex-wrap items-center gap-1.5 flex-1 sm:justify-end">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/40 px-2 py-1 text-[11px] font-mono font-medium text-foreground hover:bg-muted/70 transition-colors"
                        >
                          <span>
                            {slot.startTime.substring(0, 5)} – {slot.endTime.substring(0, 5)}
                          </span>
                          {canEdit && (
                            <DeleteAvailabilityRuleButton
                              id={slot.id}
                              label={`${dayNames[dayIndex]} ${slot.startTime.substring(0, 5)}–${slot.endTime.substring(0, 5)}`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* TAB 2: MEETING PLATFORMS */
          <form onSubmit={handleSavePlatforms} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              <p className="text-xs text-muted-foreground">
                {t(
                  "Pilih platform pertemuan yang ingin Anda sediakan pada halaman booking:",
                  "Select the meeting platform options to offer on your booking link:"
                )}
              </p>

              {/* 2-Column Clean Interactive Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLATFORM_CONFIGS.map((item) => {
                  const isChecked = allowedPlatforms.includes(item.id);
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      disabled={!canEdit}
                      onClick={() => togglePlatform(item.id)}
                      className={`relative flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                        isChecked
                          ? "border-primary bg-primary/[0.04] shadow-xs"
                          : "border-border/70 bg-card hover:bg-muted/30 opacity-70"
                      } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                            isChecked ? item.color : "bg-muted text-muted-foreground border-transparent"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{item.label}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{item.desc}</p>
                        </div>
                      </div>

                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          isChecked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground/30 bg-background"
                        }`}
                      >
                        {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Link Section with icon badge */}
              {(allowedPlatforms.includes("zoom") ||
                allowedPlatforms.includes("teams") ||
                allowedPlatforms.includes("custom")) && (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="h-3.5 w-3.5 text-primary" />
                    <Label className="text-xs font-semibold text-foreground">
                      {t("Link Ruang Meeting Tetap / Catatan", "Fixed Meeting Link / Note")}
                    </Label>
                  </div>
                  <Input
                    value={customLink}
                    disabled={!canEdit}
                    onChange={(e) => setCustomLink(e.target.value)}
                    placeholder="https://zoom.us/j/... atau https://teams.microsoft.com/..."
                    className="h-8 text-xs font-mono bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    {t(
                      "Link ini otomatis diberikan kepada klien saat konfirmasi booking berhasil.",
                      "This link is automatically sent to the client once booking is confirmed."
                    )}
                  </p>
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex justify-end pt-3 border-t mt-auto">
                <Button type="submit" size="sm" disabled={saving} className="h-8 text-xs font-semibold px-4 gap-1.5">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
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
