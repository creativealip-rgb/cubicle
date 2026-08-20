"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarIcon, Clock, User, Mail, FileText, CheckCircle2, Loader2 } from "lucide-react";
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

  function handleApplyDate() {
    if (!selectedDate) return;
    startTransition(async () => {
      try {
        setSlotsError("");
        const newSlots = await getAvailableSlots(workspace.id, selectedDate);
        setSlots(newSlots);
        setSelectedSlot("");
      } catch (err) {
        setSlotsError(err instanceof Error ? err.message : t("Gagal memuat slot", "Failed to load slots"));
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          <CalendarIcon className="mr-2 inline h-5 w-5" />
          {t("Jadwalkan Janji Temu", "Schedule Appointment")}
        </CardTitle>
      </CardHeader>
      <CardContent>
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
          <div className="space-y-2">
            <Label htmlFor="title">
              <FileText className="mr-1 inline h-4 w-4" />
              {t("Judul", "Title")}
            </Label>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("Contoh: Konsultasi proyek", "e.g. Project Consultation")}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="attendeeName">
                <User className="mr-1 inline h-4 w-4" />
                {t("Nama Kamu", "Your Name")}
              </Label>
              <Input
                id="attendeeName"
                name="attendeeName"
                value={attendeeName}
                onChange={(e) => setAttendeeName(e.target.value)}
                placeholder={t("Nama lengkap", "Your full name")}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="attendeeEmail">
                <Mail className="mr-1 inline h-4 w-4" />
                {t("Email Kamu", "Your Email")}
              </Label>
              <Input
                id="attendeeEmail"
                name="attendeeEmail"
                type="email"
                value={attendeeEmail}
                onChange={(e) => setAttendeeEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <Label htmlFor="booking-date">
              <CalendarIcon className="mr-1 inline h-4 w-4" />
              {t("Tanggal", "Date")}
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                id="booking-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="min-h-11 w-full min-w-0"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11"
                onClick={handleApplyDate}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  t("Terapkan tanggal", "Apply date")
                )}
              </Button>
            </div>
          </div>

          {/* Available slots */}
          <div className="space-y-2">
            <Label>
              <Clock className="mr-1 inline h-4 w-4" />
              {t("Waktu Tersedia", "Available Times")}
            </Label>
            <p className="text-xs text-foreground/70">{t(`Zona waktu: ${timezone}`, `Timezone: ${timezone}`)}</p>
            {isPending ? (
              <div className="flex items-center justify-center rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("Memuat waktu tersedia...", "Loading available times...")}
              </div>
            ) : slotsError ? (
              <p className="text-sm text-destructive">{slotsError}</p>
            ) : slots.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <CalendarIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm text-foreground/70">
                  {t("Tidak ada slot tersedia pada tanggal ini", "No available slots for this date")}
                </p>
                <p className="text-xs text-foreground/70">
                  {t("Coba pilih tanggal lain", "Try selecting a different date")}
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
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors ${
                        isChecked
                          ? "border-primary bg-primary/10 font-semibold"
                          : "hover:border-primary hover:bg-primary/5"
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
                      <span className="text-sm font-medium">
                        {new Date(slot.start).toLocaleTimeString(lang === "en" ? "en-US" : "id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: timezone,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground">30 min</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">
              <FileText className="mr-1 inline h-4 w-4" />
              {t("Catatan (opsional)", "Notes (optional)")}
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("Informasi tambahan...", "Any additional information...")}
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full" disabled={!selectedSlot}>
            <CheckCircle2 className="h-4 w-4" />
            {t("Pesan Janji Temu", "Book Appointment")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
