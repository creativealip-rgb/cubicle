"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
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

export const MOODS = [
  { emoji: "😊", id: "happy", en: "Happy", idLabel: "Senang" },
  { emoji: "🔥", id: "fire", en: "On Fire", idLabel: "Semangat" },
  { emoji: "🤔", id: "thinking", en: "Thinking", idLabel: "Berpikir" },
  { emoji: "🎉", id: "excited", en: "Excited", idLabel: "Antusias" },
  { emoji: "😐", id: "neutral", en: "Neutral", idLabel: "Biasa" },
  { emoji: "😴", id: "tired", en: "Tired", idLabel: "Lelah" },
  { emoji: "😤", id: "frustrated", en: "Frustrated", idLabel: "Frustrasi" },
  { emoji: "😢", id: "sad", en: "Sad", idLabel: "Sedih" },
] as const;

export function JournalComposerDialog({
  lang = "id",
  createAction,
}: {
  lang?: string;
  createAction: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string>("😊");
  const [showDetails, setShowDetails] = useState(false);

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
          {isEn ? "Write Today" : "Tulis Jurnal Hari Ini"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEn ? "New Journal Entry" : "Entri Jurnal Baru"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isEn
              ? "Record today's reflections, blockers, milestones, or insights."
              : "Catat refleksi, kendala, pencapaian, atau insight hari ini."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Mood Picker Row */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              {isEn ? "How are you feeling?" : "Bagaimana perasaanmu hari ini?"}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {MOODS.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setSelectedMood(m.emoji)}
                  className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                    selectedMood === m.emoji
                      ? "border-violet-600 bg-violet-50 text-violet-900 ring-2 ring-violet-200 dark:bg-violet-950/50 dark:text-violet-200 dark:ring-violet-900"
                      : "border-border bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  <span className="text-base">{m.emoji}</span>
                  <span>{isEn ? m.en : m.idLabel}</span>
                </button>
              ))}
            </div>
            <input type="hidden" name="mood" value={selectedMood} />
          </div>

          {/* Main Content Area (Primary Focus) */}
          <div className="space-y-1.5">
            <label htmlFor="journal-body" className="text-xs font-semibold text-foreground">
              {isEn ? "Reflection / Thoughts" : "Isi Jurnal / Catatan"} <span className="text-destructive">*</span>
            </label>
            <Textarea
              id="journal-body"
              name="body"
              required
              rows={6}
              placeholder={
                isEn
                  ? "What went well? Any obstacles, lessons, or next steps for tomorrow?"
                  : "Apa yang berjalan lancar? Kendala apa yang dihadapi, pelajaran, atau rencana esok hari?"
              }
              className="rounded-2xl text-sm"
            />
          </div>

          {/* Optional Title and Tags toggle */}
          <div className="rounded-2xl border bg-muted/20 p-3">
            <button
              type="button"
              onClick={() => setShowDetails(!showDetails)}
              className="flex w-full items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-violet-500" />
                {isEn ? "Optional: Title & Tags" : "Opsional: Judul & Tag"}
              </span>
              <span>{showDetails ? "−" : "+"}</span>
            </button>

            {showDetails && (
              <div className="mt-3 space-y-3 border-t pt-3">
                <div className="space-y-1">
                  <label htmlFor="journal-title" className="text-xs font-medium text-foreground">
                    {isEn ? "Custom Title" : "Judul Kustom"}
                  </label>
                  <Input
                    id="journal-title"
                    name="title"
                    placeholder={
                      isEn
                        ? `Default: ${new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}`
                        : `Default: ${new Date().toLocaleDateString("id-ID", { dateStyle: "medium" })}`
                    }
                    className="rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="journal-tags" className="text-xs font-medium text-foreground">
                    {isEn ? "Tags (comma separated)" : "Tag (pisahkan dengan koma)"}
                  </label>
                  <Input
                    id="journal-tags"
                    name="tags"
                    placeholder={isEn ? "dev, client, release, focus" : "kerja, rapat, rilis, fokus"}
                    className="rounded-xl text-xs"
                  />
                </div>
              </div>
            )}
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
                : isEn ? "Save Entry" : "Simpan Jurnal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
