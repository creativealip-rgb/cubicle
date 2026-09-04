"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { createPublicAppointment, getAvailableSlots } from "@/lib/actions/appointments";

interface Slot {
  start: string;
  end: string;
}

interface PublicBookingFormProps {
  workspace: {
    id: string;
    name: string;
    bookingSlug: string | null;
    logoUrl: string | null;
  };
  timezone: string;
  initialDate: string;
  initialSlots: Slot[];
  initialError?: string;
  lang: string;
}

export function PublicBookingForm({
  workspace,
  timezone,
  initialDate,
  initialSlots,
  initialError = "",
  lang,
}: PublicBookingFormProps) {
  const t = (idStr: string, enStr: string) => (lang === "en" ? enStr : idStr);
  const [title, setTitle] = useState("");
  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [selectedSlot, setSelectedSlot] = useState("");

  const [slots, setSlots] = useState<Slot[]>(initialSlots);
  const [slotsError, setSlotsError] = useState(initialError);

  const [isPending, startTransition] = useTransition();

  function handleApplyDate(newDate: string) {
    setSelectedDate(newDate);
    if (!newDate) return;
    startTransition(async () => {
      try {
        setSlotsError("");
        const newSlots = await getAvailableSlots(workspace.id, newDate);
        setSlots(newSlots);
        setSelectedSlot("");
      } catch (err) {
        setSlotsError(err instanceof Error ? err.message : t("Gagal memuat slot", "Failed to load slots"));
      }
    });
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
      <div className="border-b border-border/80 bg-muted/40 p-4 sm:p-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">{t("Jadwalkan Janji Temu", "Schedule Appointment")}</h2>
            <p className="text-[11px] text-muted-foreground">{t("Pilih tanggal & slot waktu yang sesuai", "Choose your preferred date and time slot")}</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          30 Min
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <form
          action={async () => {
            if (!title || !attendeeName || !attendeeEmail || !selectedSlot) return;
            const [startTime, endTime] = selectedSlot.split("|");
            if (!startTime || !endTime) return;

            await createPublicAppointment({
              workspaceId: workspace.id,
              title,
              notes: notes || undefined,
              attendeeName,
              attendeeEmail,
              startTime,
              endTime,
            });
            window.location.href = `/booking/${workspace.bookingSlug}?success=1`;
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="title" className="text-xs font-semibold text-foreground">
              {t("Judul Sesi", "Session Title")}
            </Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Contoh: Konsultasi Proyek Baru", "e.g. Project Consultation")}
              className="h-10 text-sm rounded-xl"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="attendeeName" className="text-xs font-semibold text-foreground">
                {t("Nama Lengkap", "Your Name")}
              </Label>
              <Input
                id="attendeeName"
                name="attendeeName"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder={t("Nama lengkap Anda", "Your full name")}
                className="h-10 text-sm rounded-xl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendeeEmail" className="text-xs font-semibold text-foreground">
                {t("Alamat Email", "Email Address")}
              </Label>
              <Input
                id="attendeeEmail"
                name="attendeeEmail"
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="you@example.com"
                className="h-10 text-sm rounded-xl"
                required
              />
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-1.5">
            <Label htmlFor="booking-date" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>{t("Pilih Tanggal", "Select Date")}</span>
              <span className="text-[11px] font-normal text-muted-foreground">Zona: {timezone}</span>
            </Label>
            <Input
              id="booking-date"
              type="date"
              value={selectedDate}
              onChange={(e) => handleApplyDate(e.target.value)}
              className="h-10 text-sm rounded-xl"
              required
            />
          </div>

          {/* Available slots */}
          <div className="space-y-2 pt-1">
            <Label className="text-xs font-semibold text-foreground">
              {t("Slot Waktu Tersedia", "Available Times")}
            </Label>
            
            {isPending ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-muted/20 p-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                <p className="text-xs text-muted-foreground">{t("Memuat slot waktu tersedia...", "Loading available times...")}</p>
              </div>
            ) : slotsError ? (
              <p className="text-xs text-destructive bg-destructive/10 p-3 rounded-xl">{slotsError}</p>
            ) : slots.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-6 text-center">
                <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-foreground">
                  {t("Tidak ada slot tersedia pada tanggal ini", "No available slots for this date")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Silakan pilih tanggal lain di kalender atas", "Try selecting a different date above")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {slots.map((slot, i) => {
                  const val = `${slot.start}|${slot.end}`;
                  const isChecked = selectedSlot === val;
                  return (
                    <label
                      key={i}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 transition-all ${
                        isChecked
                          ? "border-primary bg-primary/10 text-primary shadow-xs font-semibold ring-1 ring-primary"
                          : "border-border/80 bg-card hover:bg-muted/40 hover:border-border text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="slot"
                        value={val}
                        checked={isChecked}
                        onChange={() => setSelectedSlot(val)}
                        className="sr-only"
                        required
                      />
                      <div className="flex items-center gap-1.5">
                        <Clock className={`h-3.5 w-3.5 ${isChecked ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-xs font-mono">
                          {new Date(slot.start).toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            timeZone: timezone,
                          })}
                        </span>
                      </div>
                      <span className="text-[10px] opacity-75">30m</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <Label htmlFor="notes" className="text-xs font-semibold text-foreground">
              {t("Catatan / Kebutuhan (Opsional)", "Notes / Requirements (Optional)")}
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("Jelaskan topik yang ingin dibahas...", "Any specific topics to discuss...")}
              rows={3}
              className="text-sm rounded-xl resize-none"
            />
          </div>

          <Button type="submit" className="w-full h-11 rounded-xl font-semibold shadow-xs" disabled={!selectedSlot || !title || !attendeeName || !attendeeEmail}>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t("Konfirmasi Janji Temu", "Confirm Booking")}
          </Button>
        </form>
      </div>
    </div>
  );
}
