"use client";

import { useState } from "react";
import { Edit3, Pin, Calendar, Bell, Repeat } from "lucide-react";
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
import { NoteItem } from "./notes-list-client";

type RecurrenceRule = "none" | "daily" | "weekly" | "monthly" | "yearly";

function formatDateTimeLocal(d: string | Date | null | undefined): string {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function NoteEditModal({
  note,
  tab,
  query,
  lang = "id",
  action,
}: {
  note: NoteItem;
  tab: string;
  query: string;
  lang?: string;
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>(
    (note.recurrenceRule as RecurrenceRule) || "none"
  );
  const [notify7d, setNotify7d] = useState(Boolean(note.notify7d));
  const [notify3d, setNotify3d] = useState(Boolean(note.notify3d));
  const [notify1d, setNotify1d] = useState(Boolean(note.notify1d));
  const [pinned, setPinned] = useState(Boolean(note.pinned));

  const isEn = lang === "en";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      await action(formData);
      setOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] font-semibold rounded-lg hover:bg-background"
        >
          <Edit3 className="h-3 w-3 mr-1 text-primary" />
          {isEn ? "Edit Details" : "Edit Lengkap"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEn ? "Edit Note Details" : "Edit Detail Catatan"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEn
              ? "Update content, set reminders, due date, or recurring schedules."
              : "Perbarui isi catatan, atur pengingat notifikasi, tenggat waktu, dan perulangan."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <input type="hidden" name="noteId" value={note.id} />
          <input type="hidden" name="tab" value={tab} />
          <input type="hidden" name="q" value={query} />

          <div className="space-y-1.5">
            <label htmlFor={`edit-title-${note.id}`} className="text-xs font-semibold text-foreground">
              {isEn ? "Title" : "Judul"} <span className="text-destructive">*</span>
            </label>
            <Input
              id={`edit-title-${note.id}`}
              name="title"
              defaultValue={note.title}
              required
              placeholder={isEn ? "e.g., Domain renewal check" : "misal: Cek perpanjangan domain"}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`edit-body-${note.id}`} className="text-xs font-semibold text-foreground">
              {isEn ? "Content / Details" : "Isi Catatan"}
            </label>
            <Textarea
              id={`edit-body-${note.id}`}
              name="body"
              defaultValue={note.body || ""}
              rows={4}
              placeholder={isEn ? "Add details, links, or checklists..." : "Tambahkan detail, link, atau checklist..."}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor={`edit-due-${note.id}`} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Calendar className="size-3.5 text-muted-foreground" />
                {isEn ? "Due Date" : "Tenggat Waktu"}
              </label>
              <Input
                id={`edit-due-${note.id}`}
                name="dueDate"
                type="datetime-local"
                defaultValue={formatDateTimeLocal(note.dueDate)}
                className="rounded-xl text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`edit-rec-${note.id}`} className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Repeat className="size-3.5 text-muted-foreground" />
                {isEn ? "Recurrence" : "Perulangan"}
              </label>
              <select
                id={`edit-rec-${note.id}`}
                name="recurrenceRule"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceRule)}
                className="flex h-9 w-full rounded-xl border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="none">{isEn ? "Do not repeat" : "Tidak berulang"}</option>
                <option value="daily">{isEn ? "Daily" : "Harian"}</option>
                <option value="weekly">{isEn ? "Weekly" : "Mingguan"}</option>
                <option value="monthly">{isEn ? "Monthly" : "Bulanan"}</option>
                <option value="yearly">{isEn ? "Yearly" : "Tahunan"}</option>
              </select>
            </div>
          </div>

          {/* Reminder Notifications */}
          <div className="space-y-2 rounded-2xl border border-border/80 bg-muted/30 p-3.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Bell className="size-3.5 text-amber-500" />
              <span>{isEn ? "Reminder Notifications (Email / Alert)" : "Notifikasi Pengingat"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-1 text-xs">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background p-2 transition hover:bg-muted">
                <input
                  type="checkbox"
                  name="notify7d"
                  checked={notify7d}
                  onChange={(e) => setNotify7d(e.target.checked)}
                  className="rounded text-primary"
                />
                <span className="text-[11px] font-medium">{isEn ? "7d before" : "H-7"}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background p-2 transition hover:bg-muted">
                <input
                  type="checkbox"
                  name="notify3d"
                  checked={notify3d}
                  onChange={(e) => setNotify3d(e.target.checked)}
                  className="rounded text-primary"
                />
                <span className="text-[11px] font-medium">{isEn ? "3d before" : "H-3"}</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border bg-background p-2 transition hover:bg-muted">
                <input
                  type="checkbox"
                  name="notify1d"
                  checked={notify1d}
                  onChange={(e) => setNotify1d(e.target.checked)}
                  className="rounded text-primary"
                />
                <span className="text-[11px] font-medium">{isEn ? "1d before" : "H-1"}</span>
              </label>
            </div>
          </div>

          {/* Pin toggle */}
          <div className="flex items-center justify-between rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <Pin className="size-4 text-amber-500" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">{isEn ? "Pin to Top" : "Sematkan di Atas"}</p>
                <p className="text-[10px] text-muted-foreground">{isEn ? "Keep this note on priority list" : "Tampilkan prioritas di urutan teratas"}</p>
              </div>
            </div>
            <input
              type="checkbox"
              name="pinned"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="size-4 rounded text-primary"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              {isEn ? "Cancel" : "Batal"}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={pending}
              className="rounded-xl bg-violet-600 font-semibold text-white hover:bg-violet-700"
            >
              {pending
                ? isEn ? "Saving..." : "Menyimpan..."
                : isEn ? "Save Changes" : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
