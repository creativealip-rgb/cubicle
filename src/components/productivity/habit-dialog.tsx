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

interface HabitDialogProps {
  t: (id: string, en: string) => string;
  goals: { id: string; title: string }[];
  today: string;
  createHabitAction: (fd: FormData) => Promise<void>;
}

export function HabitDialog({
  t,
  goals,
  today,
  createHabitAction,
}: HabitDialogProps) {
  const [open, setOpen] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "specific_weekdays">("daily");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl bg-violet-600 font-semibold text-white shadow-sm transition hover:bg-violet-700">
          <Plus className="mr-1.5 size-4" />
          {t("Tambah Kebiasaan", "Add Habit")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t("Buat Kebiasaan Baru", "Create New Habit")}
          </DialogTitle>
        </DialogHeader>
        <form
          action={async (fd) => {
            await createHabitAction(fd);
            setOpen(false);
          }}
          className="mt-4 space-y-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Nama Kebiasaan", "Habit Name")}
            </label>
            <Input
              name="name"
              required
              placeholder={t("Contoh: Olahraga Pagi 30 Menit", "e.g. 30-Min Morning Workout")}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Mulai Tanggal", "Start Date")}
              </label>
              <Input
                name="startDate"
                type="date"
                required
                defaultValue={today}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Warna Aksen", "Accent Color")}
              </label>
              <Input
                name="color"
                type="color"
                defaultValue="#6366f1"
                className="h-10 w-full rounded-xl cursor-pointer p-1"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Hubungkan ke Tujuan", "Link to Goal (Optional)")}
            </label>
            <select
              name="goalId"
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="">{t("Tanpa tujuan", "No goal linked")}</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Frekuensi", "Frequency")}
            </label>
            <select
              name="frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as "daily" | "specific_weekdays")}
              className="h-10 w-full rounded-xl border bg-background px-3 text-sm"
            >
              <option value="daily">{t("Setiap Hari (Daily)", "Every Day (Daily)")}</option>
              <option value="specific_weekdays">
                {t("Hari Tertentu (Specific Weekdays)", "Specific Weekdays")}
              </option>
            </select>
          </div>

          {frequency === "specific_weekdays" && (
            <div className="space-y-2 rounded-2xl border bg-muted/30 p-3.5">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t("Pilih Hari Aktif", "Select Active Days")}
              </span>
              <div className="grid grid-cols-7 gap-1 text-center">
                {[
                  { label: "Min", val: 0 },
                  { label: "Sen", val: 1 },
                  { label: "Sel", val: 2 },
                  { label: "Rab", val: 3 },
                  { label: "Kam", val: 4 },
                  { label: "Jum", val: 5 },
                  { label: "Sab", val: 6 },
                ].map((d) => (
                  <label
                    key={d.val}
                    className="flex flex-col items-center gap-1 rounded-lg border bg-card p-1.5 text-xs font-medium cursor-pointer hover:bg-muted"
                  >
                    <input
                      type="checkbox"
                      name="weekdays"
                      value={d.val}
                      defaultChecked={[1, 3, 5].includes(d.val)}
                      className="size-3.5"
                    />
                    <span>{d.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button type="submit" className="w-full rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-700">
              {t("Simpan Kebiasaan", "Save Habit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
