"use client";

import { useState } from "react";
import { Plus, Pin, Calendar, Bell, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

export function NoteEditorDialog({
  lang = "id",
  createAction,
}: {
  lang?: string;
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("none");
  const [notify7d, setNotify7d] = useState(false);
  const [notify3d, setNotify3d] = useState(false);
  const [notify1d, setNotify1d] = useState(false);
  const [pinned, setPinned] = useState(false);

  const isEn = lang === "en";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      await createAction(formData);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1 bg-violet-600 font-semibold text-white hover:bg-violet-700">
          <Plus className="h-4 w-4" />
          {isEn ? "New Note" : "Catatan Baru"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEn ? "Create New Note" : "Buat Catatan Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEn
              ? "Capture ideas, personal todos, or reminders safely in this workspace."
              : "Simpan ide, to-do pribadi, atau pengingat secara aman di workspace ini."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <label htmlFor="note-title" className="text-xs font-semibold text-foreground">
              {isEn ? "Title" : "Judul"} <span className="text-destructive">*</span>
            </label>
            <Input
              id="note-title"
              name="title"
              required
              placeholder={isEn ? "e.g., Domain renewal check" : "misal: Cek perpanjangan domain"}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="note-body" className="text-xs font-semibold text-foreground">
              {isEn ? "Content / Details" : "Isi Catatan"}
            </label>
            <Textarea
              id="note-body"
              name="body"
              rows={4}
              placeholder={isEn ? "Add details, links, or checklists..." : "Tambahkan detail, link, atau checklist..."}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="note-due" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="size-3.5 text-muted-foreground" />
                {isEn ? "Due Date" : "Tenggat Waktu"}
              </label>
              <Input
                id="note-due"
                name="dueDate"
                type="datetime-local"
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="note-recurrence" className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Repeat className="size-3.5 text-muted-foreground" />
                {isEn ? "Recurrence" : "Perulangan"}
              </label>
              <select
                id="note-recurrence"
                name="recurrenceRule"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm"
              >
                <option value="none">{isEn ? "Does not repeat" : "Tidak berulang"}</option>
                <option value="daily">{isEn ? "Daily" : "Harian"}</option>
                <option value="weekly">{isEn ? "Weekly" : "Mingguan"}</option>
                <option value="monthly">{isEn ? "Monthly" : "Bulanan"}</option>
                <option value="yearly">{isEn ? "Yearly" : "Tahunan"}</option>
              </select>
            </div>
          </div>

          {/* Reminders & Pin Options */}
          <div className="space-y-2 rounded-2xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Bell className="size-3.5" />
                {isEn ? "Remind before due" : "Ingatkan sebelum tenggat"}
              </span>
              <div className="flex items-center gap-1.5">
                {[
                  { key: "notify7d", label: "7d", val: notify7d, set: setNotify7d },
                  { key: "notify3d", label: "3d", val: notify3d, set: setNotify3d },
                  { key: "notify1d", label: "1d", val: notify1d, set: setNotify1d },
                ].map(({ key, label, val, set }) => (
                  <label
                    key={key}
                    className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-1 text-[11px] font-semibold transition ${
                      val
                        ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
                        : "border-border bg-background text-muted-foreground hover:border-muted-foreground/50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      name={key}
                      checked={val}
                      onChange={(e) => set(e.target.checked)}
                      className="sr-only"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <Pin className="size-3.5 text-muted-foreground" />
                {isEn ? "Pin to top" : "Sematkan di atas"}
              </span>
              <label
                className={`flex cursor-pointer items-center rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition ${
                  pinned
                    ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                    : "border-border bg-background text-muted-foreground"
                }`}
              >
                <input
                  type="checkbox"
                  name="pinned"
                  checked={pinned}
                  onChange={(e) => setPinned(e.target.checked)}
                  className="sr-only"
                />
                {pinned ? (isEn ? "Pinned" : "Disematkan") : (isEn ? "Normal" : "Biasa")}
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
              disabled={pending}
            >
              {isEn ? "Cancel" : "Batal"}
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-violet-600 text-white hover:bg-violet-700"
              disabled={pending}
            >
              {pending
                ? isEn ? "Saving..." : "Menyimpan..."
                : isEn ? "Save Note" : "Simpan Catatan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
