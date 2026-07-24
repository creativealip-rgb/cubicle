"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [timezone, setTimezone] = useState("Asia/Jakarta");
  const timeInvalid = startTime >= endTime;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (timeInvalid) {
      toast.error(t("Waktu selesai harus setelah waktu mulai", "End time must be after start time"));
      return;
    }
    setLoading(true);
    try {
      await createAvailabilityRule({ dayOfWeek: Number(dayOfWeek), startTime, endTime, timezone });
      toast.success(t("Aturan ketersediaan ditambahkan", "Availability rule added"));
      setOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menambah aturan", "Failed to add rule"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="min-h-10 gap-1.5">
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="availability-start">{t("Waktu mulai", "Start time")} *</Label>
              <Input id="availability-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="availability-end">{t("Waktu selesai", "End time")} *</Label>
              <Input id="availability-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={`h-11 ${timeInvalid ? "border-destructive" : ""}`} required aria-invalid={timeInvalid} />
            </div>
          </div>
          {timeInvalid ? <p className="text-xs text-destructive">{t("Waktu selesai harus setelah waktu mulai", "End time must be after start time")}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="availability-timezone">{t("Zona waktu", "Timezone")} *</Label>
            <Input id="availability-timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="h-11" placeholder="Asia/Jakarta" required />
            <p className="text-xs text-muted-foreground">{t("Gunakan format zona IANA, misalnya Asia/Jakarta.", "Use an IANA timezone, for example Asia/Jakarta.")}</p>
          </div>
          <Button type="submit" disabled={loading || timeInvalid || !timezone.trim()} className="min-h-11 w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("Simpan aturan", "Save rule")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
