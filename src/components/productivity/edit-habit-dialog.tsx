"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2, Archive } from "lucide-react";
import { updatePersonalHabit, deletePersonalHabit } from "@/lib/actions/personal-habits";
import { toast } from "sonner";
import { useConfirm } from "@/lib/hooks/use-confirm";

const WEEKDAYS = [
  { value: 1, label: "M", fullId: "Sen", fullEn: "Mon" },
  { value: 2, label: "T", fullId: "Sel", fullEn: "Tue" },
  { value: 3, label: "W", fullId: "Rab", fullEn: "Wed" },
  { value: 4, label: "T", fullId: "Kam", fullEn: "Thu" },
  { value: 5, label: "F", fullId: "Jum", fullEn: "Fri" },
  { value: 6, label: "S", fullId: "Sab", fullEn: "Sat" },
  { value: 0, label: "S", fullId: "Min", fullEn: "Sun" },
];

export interface EditHabitItem {
  id: string;
  name: string;
  startDate: string;
  frequency: "daily" | "specific_weekdays" | string;
  weekdays: number[];
  goalId?: string | null;
  status: string;
}

interface EditHabitDialogProps {
  habit: EditHabitItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lang?: string;
  goals?: { id: string; title: string }[];
  onSaved?: () => void;
}

export function EditHabitDialog({
  habit,
  open,
  onOpenChange,
  lang = "id",
  goals = [],
  onSaved,
}: EditHabitDialogProps) {
  const isEn = lang === "en";
  const { confirm, dialog } = useConfirm();
  const [name, setName] = useState(habit?.name || "");
  const [frequency, setFrequency] = useState<"daily" | "specific_weekdays">(
    (habit?.frequency as "daily" | "specific_weekdays") || "daily"
  );
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(
    habit?.weekdays?.length ? habit.weekdays : [1, 2, 3, 4, 5]
  );
  const [startDate, setStartDate] = useState(habit?.startDate || "");
  const [goalId, setGoalId] = useState(habit?.goalId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (habit && open) {
      setName(habit.name);
      setFrequency((habit.frequency as "daily" | "specific_weekdays") || "daily");
      setSelectedWeekdays(habit.weekdays?.length ? habit.weekdays : [1, 2, 3, 4, 5]);
      setStartDate(habit.startDate);
      setGoalId(habit.goalId || "");
      setError("");
    }
  }, [habit, open]);

  const handleOpenChange = (isOpen: boolean) => {
    onOpenChange(isOpen);
  };

  function toggleWeekday(val: number) {
    setSelectedWeekdays((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!habit) return;
    setError("");

    if (!name.trim()) {
      setError(isEn ? "Habit name is required." : "Nama kebiasaan wajib diisi.");
      return;
    }

    if (frequency === "specific_weekdays" && selectedWeekdays.length === 0) {
      setError(isEn ? "Select at least one day." : "Pilih minimal satu hari.");
      return;
    }

    setLoading(true);
    try {
      await updatePersonalHabit(habit.id, {
        name: name.trim(),
        frequency,
        weekdays: frequency === "daily" ? [] : selectedWeekdays,
        startDate,
        goalId: goalId || null,
        status: habit.status as "active" | "archived",
      });
      toast.success(isEn ? "Habit updated" : "Kebiasaan diperbarui");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal update habit");
    } finally {
      setLoading(false);
    }
  }

  async function handleArchive() {
    if (!habit) return;
    setLoading(true);
    try {
      await updatePersonalHabit(habit.id, {
        name: habit.name,
        frequency: habit.frequency as "daily" | "specific_weekdays",
        weekdays: habit.weekdays,
        startDate: habit.startDate,
        goalId: habit.goalId,
        status: "archived",
      });
      toast.success(isEn ? "Habit archived" : "Kebiasaan diarsipkan");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal arsipkan habit");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!habit) return;
    const ok = await confirm({
      title: isEn ? "Delete habit?" : "Hapus kebiasaan?",
      description: isEn
        ? "This will delete the habit and its check-in records permanently."
        : "Ini akan menghapus kebiasaan dan seluruh catatan ceklis secara permanen.",
      confirmLabel: isEn ? "Delete" : "Hapus",
      destructive: true,
    });
    if (!ok) return;

    setLoading(true);
    try {
      await deletePersonalHabit(habit.id);
      toast.success(isEn ? "Habit deleted" : "Kebiasaan dihapus");
      onOpenChange(false);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus habit");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {dialog}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md rounded-2xl p-5 sm:p-6">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-bold">
              {isEn ? "Edit Habit" : "Edit Kebiasaan"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="mt-2 space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {isEn ? "Habit Name" : "Nama Kebiasaan"}
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-8 rounded-lg text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isEn ? "Frequency" : "Frekuensi"}
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "daily" | "specific_weekdays")}
                  className="h-8 w-full rounded-lg border bg-background px-2 text-xs"
                >
                  <option value="daily">{isEn ? "Every Day" : "Setiap Hari"}</option>
                  <option value="specific_weekdays">{isEn ? "Specific Days" : "Hari Tertentu"}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {isEn ? "Start Date" : "Mulai Tanggal"}
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
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
                          active ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
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
                  value={goalId}
                  onChange={(e) => setGoalId(e.target.value)}
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

            {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={handleArchive}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-amber-600"
                  title={isEn ? "Archive Habit" : "Arsipkan Kebiasaan"}
                >
                  <Archive className="h-3.5 w-3.5 mr-1" />
                  {isEn ? "Archive" : "Arsipkan"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={loading}
                  onClick={handleDelete}
                  className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                  title={isEn ? "Delete Habit" : "Hapus Kebiasaan"}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  {isEn ? "Delete" : "Hapus"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                  className="h-8 rounded-lg text-xs"
                >
                  {isEn ? "Cancel" : "Batal"}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="h-8 rounded-lg bg-violet-600 px-4 text-xs font-semibold text-white shadow-none hover:bg-violet-700"
                >
                  {loading ? (isEn ? "Saving..." : "Menyimpan...") : (isEn ? "Save" : "Simpan")}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
