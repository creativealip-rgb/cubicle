"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { createAvailabilityRule } from "@/lib/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus } from "lucide-react";
import { useT } from "@/lib/i18n-client";

const DAYS = [
  ["Minggu", "Sunday"], ["Senin", "Monday"], ["Selasa", "Tuesday"], ["Rabu", "Wednesday"],
  ["Kamis", "Thursday"], ["Jumat", "Friday"], ["Sabtu", "Saturday"],
] as const;

export function AvailabilityRuleForm() {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const [slots, setSlots] = useState<{ startTime: string; endTime: string }[]>([
    { startTime: "09:00", endTime: "17:00" },
  ]);

  function addSlot() {
    setSlots((prev) => [...prev, { startTime: "09:00", endTime: "17:00" }]);
  }

  function removeSlot(index: number) {
    if (slots.length <= 1) return;
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, patch: Partial<{ startTime: string; endTime: string }>) {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  const hasInvalidSlot = slots.some((s) => s.startTime >= s.endTime);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (hasInvalidSlot) {
      toast.error(t("Waktu selesai harus setelah waktu mulai pada setiap rentang", "End time must be after start time for all slots"));
      return;
    }
    setLoading(true);
    try {
      let createdCount = 0;
      for (const slot of slots) {
        const result = await createAvailabilityRule({
          dayOfWeek: Number(dayOfWeek),
          startTime: slot.startTime,
          endTime: slot.endTime,
          timezone,
        });
        if (result.ok) {
          createdCount++;
        }
      }
      if (createdCount === 0) {
        toast.error(t("Slot waktu sudah ada sebelumnya", "Availability slots already exist"));
      } else {
        toast.success(t(`${createdCount} aturan ketersediaan ditambahkan`, `${createdCount} availability rules added`));
        setOpen(false);
        setSlots([{ startTime: "09:00", endTime: "17:00" }]);
        refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menambah aturan", "Failed to add rule"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1">
          <Plus className="h-4 w-4" /> {t("Tambah aturan", "Add rule")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("Tambah aturan ketersediaan", "Add availability rule")}</DialogTitle>
          <DialogDescription>{t("Tentukan hari, jam, dan zona waktu untuk menerima booking.", "Set the day, hours, and timezone for bookings.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-1">
          <div className="space-y-2">
            <Label>{t("Hari", "Day")} *</Label>
            <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAYS.map((day, index) => <SelectItem key={index} value={String(index)}>{t(day[0], day[1])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("Rentang Jam Kerja", "Working Hours Range")} *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSlot} className="h-7 text-xs gap-1">
                <Plus className="h-3.5 w-3.5" />
                {t("Tambah jam", "Add range")}
              </Button>
            </div>

            {slots.map((slot, index) => {
              const invalid = slot.startTime >= slot.endTime;
              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="grid grid-cols-2 gap-2 flex-1">
                    <Input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(index, { startTime: e.target.value })}
                      className="h-10 text-xs"
                      required
                    />
                    <Input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(index, { endTime: e.target.value })}
                      className={`h-10 text-xs ${invalid ? "border-destructive" : ""}`}
                      required
                      aria-invalid={invalid}
                    />
                  </div>
                  {slots.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSlot(index)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {hasInvalidSlot ? <p className="text-xs text-destructive">{t("Waktu selesai harus setelah waktu mulai pada setiap rentang", "End time must be after start time for all slots")}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="availability-timezone">{t("Zona waktu", "Timezone")} *</Label>
            <Input id="availability-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-11" placeholder="Asia/Jakarta" required />
            <p className="text-xs text-muted-foreground">{t("Gunakan format zona IANA, misalnya Asia/Jakarta.", "Use an IANA timezone, for example Asia/Jakarta.")}</p>
          </div>
          <Button type="submit" disabled={loading || hasInvalidSlot || !timezone.trim()} className="min-h-11 w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("Simpan aturan", "Save rule")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
