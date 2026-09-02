"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";

const WEEKDAYS = [
  { value: 1, label: "M", fullId: "Sen", fullEn: "Mon" },
  { value: 2, label: "T", fullId: "Sel", fullEn: "Tue" },
  { value: 3, label: "W", fullId: "Rab", fullEn: "Wed" },
  { value: 4, label: "T", fullId: "Kam", fullEn: "Thu" },
  { value: 5, label: "F", fullId: "Jum", fullEn: "Fri" },
  { value: 6, label: "S", fullId: "Sab", fullEn: "Sat" },
  { value: 0, label: "S", fullId: "Min", fullEn: "Sun" },
];

interface HabitDialogProps {
  lang?: string;
  goals?: { id: string; title: string }[];
  today: string;
  createHabitAction: (fd: FormData) => Promise<void>;
}

export function HabitDialog({
  lang = "id",
  goals = [],
  today,
  createHabitAction,
}: HabitDialogProps) {
  const isEn = lang === "en";
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "specific_weekdays">("daily");
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);

  function toggleWeekday(val: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val],
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white shadow-none transition hover:bg-violet-700">
          <Plus className="size-3.5" />
          <span>{isEn ? "Add Habit" : "Tambah Kebiasaan"}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base font-bold">
            {isEn ? "Track New Habit" : "Pantau Kebiasaan Baru"}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            selectedWeekdays.forEach((d) => fd.append("weekdays", String(d)));
            await createHabitAction(fd);
            setOpen(false);
          }}
          className="mt-2 space-y-3"
        >
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              {isEn ? "Habit Name" : "Nama Kebiasaan"}
            </label>
            <Input
              name="name"
              required
              placeholder={isEn ? "e.g. Read 15 mins daily" : "Contoh: Baca buku 15 menit"}
              className="h-8 rounded-lg text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Frequency" : "Frekuensi"}
              </label>
              <select
                name="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as "daily" | "specific_weekdays")}
                className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
              >
                <option value="daily">{isEn ? "Every Day" : "Setiap Hari"}</option>
                <option value="specific_weekdays">
                  {isEn ? "Specific Days" : "Hari Tertentu"}
                </option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Start Date" : "Mulai Tanggal"}
              </label>
              <Input
                name="startDate"
                type="date"
                defaultValue={today}
                required
                className="h-8 rounded-lg text-xs"
              />
            </div>
          </div>

          {frequency === "specific_weekdays" && (
            <div className="space-y-1 rounded-lg border bg-muted/20 p-2.5">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                {isEn ? "Select Days" : "Pilih Hari"}
              </label>
              <div className="flex justify-between gap-1">
                {WEEKDAYS.map((d) => {
                  const active = selectedWeekdays.includes(d.value);
                  return (
                    <button
                      type="button"
                      key={d.value}
                      onClick={() => toggleWeekday(d.value)}
                      title={isEn ? d.fullEn : d.fullId}
                      className={`size-7 rounded-lg text-xs font-bold transition ${
                        active
                          ? "bg-violet-600 text-white"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {goals.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Link to Goal (Optional)" : "Tautkan ke Tujuan (Opsional)"}
              </label>
              <select
                name="goalId"
                className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
              >
                <option value="">{isEn ? "None" : "Tidak ada"}</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-8 rounded-lg text-xs"
            >
              {isEn ? "Cancel" : "Batal"}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="h-8 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-none hover:bg-violet-700"
            >
              {isEn ? "Save Habit" : "Simpan Kebiasaan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
