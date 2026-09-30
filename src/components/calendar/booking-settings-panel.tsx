"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import {
  Clock,
  Video,
  Check,
  Loader2,
  Phone,
  Users,
  Link as LinkIcon,
  Sparkles,
} from "lucide-react";
import { updateWorkspaceBookingSlug } from "@/lib/actions/workspace";
import { Card, CardContent } from "@/components/ui/card";
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

const ORDERED_DAYS = [1, 2, 3, 4, 5, 6, 0]; // Mon -> Sun

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
  const [selectedDay, setSelectedDay] = useState<number>(1); // Default to Monday (1)

  const [customLink, setCustomLink] = useState(defaultLink ?? "");
  const [allowedPlatforms, setAllowedPlatforms] = useState<string[]>(
    defaultAllowedPlatforms && defaultAllowedPlatforms.length > 0
      ? defaultAllowedPlatforms
      : ["google_meet", "zoom", "teams", "phone", "in_person", "custom"]
  );
  const [saving, setSaving] = useState(false);

  // Group rules by Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const rulesByDay = useMemo(() => {
    const map = new Map<number, AvailabilityRuleItem[]>();
    for (const d of ORDERED_DAYS) {
      map.set(d, []);
    }
    for (const rule of rules) {
      const list = map.get(rule.dayOfWeek) ?? [];
      list.push(rule);
      map.set(rule.dayOfWeek, list);
    }
    // Sort slots inside each day chronologically
    map.forEach((slots) => {
      slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    });
    return map;
  }, [rules]);

  const activeDaySlots = rulesByDay.get(selectedDay) ?? [];

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
      {/* Sleek Segmented Control Header */}
      <div className="border-b bg-muted/30 px-4 py-3">
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/80 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("hours")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "hours"
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Clock className={`h-3.5 w-3.5 ${activeTab === "hours" ? "text-primary" : ""}`} />
            <span>{t("Jam Kerja", "Working Hours")}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                activeTab === "hours" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {rules.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("platforms")}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "platforms"
                ? "bg-background text-foreground shadow-xs ring-1 ring-border/80"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Video className={`h-3.5 w-3.5 ${activeTab === "platforms" ? "text-primary" : ""}`} />
            <span>{t("Platform Meeting", "Meeting Platforms")}</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                activeTab === "platforms" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              }`}
            >
              {allowedPlatforms.length}
            </span>
          </button>
        </div>
      </div>

      <CardContent className="p-4 flex-1 flex flex-col">
        {activeTab === "hours" ? (
          /* TAB 1: WORKING HOURS WITH INTERACTIVE 7-DAY SELECTOR */
          <div className="space-y-3.5 flex-1 flex flex-col">
            {/* 7-Day Selector Bar */}
            <div className="grid grid-cols-7 gap-1.5 p-1 rounded-xl bg-muted/40 border border-border/60">
              {ORDERED_DAYS.map((dayIndex) => {
                const isSelected = selectedDay === dayIndex;
                const count = rulesByDay.get(dayIndex)?.length ?? 0;
                return (
                  <button
                    type="button"
                    key={`day-btn-${dayIndex}`}
                    onClick={() => setSelectedDay(dayIndex)}
                    className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-background text-primary shadow-xs font-bold ring-1 ring-border"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    }`}
                  >
                    <span className="text-[11px] uppercase tracking-wider">{dayShortNames[dayIndex]}</span>
                    <div className="mt-0.5 flex items-center gap-1">
                      {count > 0 ? (
                        <span
                          className={`inline-flex items-center justify-center rounded-full text-[9px] font-mono font-bold px-1.5 py-0.2 ${
                            isSelected ? "bg-primary text-primary-foreground" : "bg-muted-foreground/15 text-foreground"
                          }`}
                        >
                          {count}
                        </span>
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Day Slots Detail View */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2.5 border-b border-border/50 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">
                      {dayNames[selectedDay]}
                    </span>
                    <span className="text-xs text-muted-foreground font-medium">
                      ({activeDaySlots.length} {t("slot jam aktif", "active slots")})
                    </span>
                  </div>
                  {activeDaySlots.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      ● {t("Tersedia", "Available")}
                    </span>
                  )}
                </div>

                {activeDaySlots.length === 0 ? (
                  <div className="py-8 flex flex-col items-center justify-center text-center">
                    <Clock className="h-7 w-7 text-muted-foreground/40 mb-2" />
                    <p className="text-xs font-semibold text-foreground">
                      {t(`Tidak ada jam kerja di hari ${dayNames[selectedDay]}`, `No working hours for ${dayNames[selectedDay]}`)}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("Klien tidak dapat memesan sesi pada hari ini.", "Clients cannot book appointments on this day.")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeDaySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border/80 bg-muted/20 hover:bg-muted/40 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs font-mono font-bold text-foreground">
                            {slot.startTime.substring(0, 5)} – {slot.endTime.substring(0, 5)}
                          </span>
                        </div>
                        {canEdit && (
                          <DeleteAvailabilityRuleButton
                            id={slot.id}
                            label={`${dayNames[selectedDay]} ${slot.startTime.substring(0, 5)}–${slot.endTime.substring(0, 5)}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {canEdit && (
                <div className="pt-3 border-t border-border/50 mt-3 flex justify-end">
                  <AvailabilityRuleForm />
                </div>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: MEETING PLATFORMS */
          <form onSubmit={handleSavePlatforms} className="space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-3.5">
              <div>
                <p className="text-xs font-semibold text-foreground">
                  {t("Platform yang Ditawarkan", "Offered Platforms")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t(
                    "Pilih opsi platform yang dapat dipilih oleh klien saat membuat janji temu:",
                    "Choose platform options that clients can select during booking:"
                  )}
                </p>
              </div>

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

              {/* Refined Minimalist Fixed Meeting Link Container */}
              {(allowedPlatforms.includes("zoom") ||
                allowedPlatforms.includes("teams") ||
                allowedPlatforms.includes("custom")) && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <LinkIcon className="h-3.5 w-3.5 text-primary" />
                      {t("Link Ruang Meeting Tetap", "Fixed Meeting Link")}
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {t("Opsional", "Optional")}
                    </span>
                  </div>
                  <div className="relative">
                    <Input
                      value={customLink}
                      disabled={!canEdit}
                      onChange={(e) => setCustomLink(e.target.value)}
                      placeholder="https://zoom.us/j/... atau https://teams.microsoft.com/..."
                      className="h-9 text-xs font-mono bg-muted/20 border-border/80 focus:bg-background rounded-xl"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-normal">
                    {t(
                      "Otomatis dikirimkan ke email/portal klien saat jadwal booking terkonfirmasi.",
                      "Automatically shared with client once booking is confirmed."
                    )}
                  </p>
                </div>
              )}
            </div>

            {canEdit && (
              <div className="flex justify-end pt-3 border-t mt-auto">
                <Button type="submit" size="sm" disabled={saving} className="h-8 text-xs font-semibold px-4 gap-1.5 rounded-lg">
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
