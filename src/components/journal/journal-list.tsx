"use client";

import { useMemo, useState } from "react";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ConfirmSubmitButton } from "@/components/ui/confirm-submit-button";
import {
  Archive,
  Download,
  Pencil,
  RotateCcw,
  Search,
  SmilePlus,
  Trash2,
} from "lucide-react";

export type JournalEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  mood: string;
  content: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export const MOODS = [
  { emoji: "😊", id: "happy", en: "Happy", idLabel: "Senang" },
  { emoji: "😐", id: "neutral", en: "Neutral", idLabel: "Biasa" },
  { emoji: "😤", id: "frustrated", en: "Frustrated", idLabel: "Frustrasi" },
  { emoji: "🤔", id: "thinking", en: "Thinking", idLabel: "Berpikir" },
  { emoji: "😴", id: "tired", en: "Tired", idLabel: "Lelah" },
  { emoji: "🔥", id: "fire", en: "On Fire", idLabel: "Semangat" },
  { emoji: "😢", id: "sad", en: "Sad", idLabel: "Sedih" },
  { emoji: "🎉", id: "excited", en: "Excited", idLabel: "Senang sekali" },
] as const;

function moodLabel(emoji: string, isId: boolean) {
  const m = MOODS.find((x) => x.emoji === emoji);
  if (!m) return emoji;
  return isId ? m.idLabel : m.en;
}

export function JournalList({
  entries,
  tab,
  actions,
  lang = "id",
}: {
  entries: JournalEntry[];
  tab: "active" | "archived";
  actions: {
    archive: (formData: FormData) => Promise<void>;
    restore: (formData: FormData) => Promise<void>;
    update: (formData: FormData) => Promise<void>;
    remove: (formData: FormData) => Promise<void>;
  };
  lang?: "id" | "en" | string;
}) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const isId = lang !== "en";

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [entries]);

  const usedMoods = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.mood) set.add(e.mood);
    });
    return MOODS.filter((m) => set.has(m.emoji));
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchTag = !selectedTag || e.tags.includes(selectedTag);
      const matchMood = !selectedMood || e.mood === selectedMood;
      return matchSearch && matchTag && matchMood;
    });
  }, [entries, search, selectedTag, selectedMood]);

  const handleExport = () => {
    const text = filtered
      .map((e) => {
        const date = new Date(e.createdAt).toLocaleDateString(
          isId ? "id-ID" : "en-US",
          {
            dateStyle: "full",
          },
        );
        const tags = e.tags.length > 0 ? `Tags: ${e.tags.join(", ")}` : "";
        const mood = e.mood ? `Mood: ${e.mood} ${moodLabel(e.mood, isId)}` : "";
        return `${date} — ${e.title}\n${[mood, tags].filter(Boolean).join(" | ")}\n\n${e.content}\n\n---\n`;
      })
      .join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal-export-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={isId ? "Cari entri jurnal" : "Search journal entries"}
            placeholder={
              isId ? "Cari entri jurnal…" : "Search journal entries…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          className="gap-1.5"
          disabled={filtered.length === 0}
        >
          <Download className="h-3.5 w-3.5" />
          {isId ? "Ekspor TXT" : "Export TXT"}
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            className="h-8 min-h-8 px-2.5 text-xs"
            onClick={() => setSelectedTag(null)}
          >
            {isId ? "Semua tag" : "All tags"}
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              className="h-8 min-h-8 px-2.5 text-xs"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      {usedMoods.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">
            {isId ? "Mood:" : "Mood:"}
          </span>
          <Button
            variant={selectedMood === null ? "default" : "outline"}
            size="sm"
            className="h-8 min-h-8 px-2.5 text-xs"
            onClick={() => setSelectedMood(null)}
          >
            {isId ? "Semua" : "All"}
          </Button>
          {usedMoods.map((m) => (
            <Button
              key={m.emoji}
              variant={selectedMood === m.emoji ? "default" : "outline"}
              size="sm"
              className="min-h-11 gap-1 text-xs"
              onClick={() =>
                setSelectedMood(selectedMood === m.emoji ? null : m.emoji)
              }
              title={isId ? m.idLabel : m.en}
            >
              <span>{m.emoji}</span>
              <span className="hidden sm:inline">
                {isId ? m.idLabel : m.en}
              </span>
            </Button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {isId ? "Menampilkan" : "Showing"} {filtered.length}{" "}
        {isId ? "dari" : "of"} {entries.length} {isId ? "entri" : "entries"}
        {search && ` · “${search}”`}
        {selectedTag && ` · #${selectedTag}`}
        {selectedMood && ` · ${selectedMood}`}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {entries.length === 0
              ? tab === "archived"
                ? isId
                  ? "Belum ada arsip jurnal."
                  : "No archived journal entries."
                : isId
                  ? "Belum ada jurnal. Tulis entri pertama di atas."
                  : "No journal entries yet. Write your first entry above."
              : isId
                ? "Tidak ada entri yang cocok."
                : "No matching entries."}
          </p>
        </div>
      ) : (
        <div className="divide-y" data-ui="journal-timeline-list">
          {filtered.map((entry) => {
            const editing = editingId === entry.id;
            const expanded = expandedId === entry.id || editing;
            return (
              <article
                key={entry.id}
                className="relative py-2.5 pl-7 pr-1 sm:pl-9"
              >
                <span className="absolute left-1.5 top-4 h-2.5 w-2.5 rounded-full bg-primary sm:left-2.5" />
                <span className="absolute bottom-0 left-[10px] top-7 w-px bg-border sm:left-[14px]" />
                <div
                  className="block w-full cursor-pointer text-left"
                  onClick={() => setExpandedId(expanded ? null : entry.id)}
                  role="button"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setExpandedId(expanded ? null : entry.id);
                    }
                  }}
                >
                  <CardHeader className="p-0 pb-1">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                        {entry.mood ? (
                          <span
                            className="text-lg"
                            title={moodLabel(entry.mood, isId)}
                          >
                            {entry.mood}
                          </span>
                        ) : null}
                        <span className="truncate">{entry.title}</span>
                        {entry.status === "archived" ? (
                          <Badge variant="outline" className="text-[10px]">
                            {isId ? "Arsip" : "Archived"}
                          </Badge>
                        ) : null}
                      </CardTitle>
                      <div
                        className="flex shrink-0 items-center gap-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <span className="mr-1 text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleDateString(
                            isId ? "id-ID" : "en-US",
                            { dateStyle: "medium" },
                          )}
                        </span>
                        {expanded && tab !== "archived" ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            aria-label={isId ? "Ubah" : "Edit"}
                            onClick={() =>
                              setEditingId(editing ? null : entry.id)
                            }
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                        {expanded && tab === "archived" ? (
                          <form action={actions.restore}>
                            <input
                              type="hidden"
                              name="noteId"
                              value={entry.id}
                            />
                            <input type="hidden" name="tab" value="archived" />
                            <Button
                              type="submit"
                              size="sm"
                              variant="outline"
                              className="gap-1"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">
                                {isId ? "Pulihkan" : "Restore"}
                              </span>
                            </Button>
                          </form>
                        ) : expanded ? (
                          <ConfirmSubmitButton
                            action={actions.archive}
                            fields={{ noteId: entry.id, tab: "active" }}
                            label={isId ? "Arsipkan" : "Archive"}
                            title={isId ? "Arsipkan entri?" : "Archive entry?"}
                            description={
                              isId
                                ? "Entri dipindahkan ke arsip dan dapat dipulihkan nanti."
                                : "Entry moves to archive and can be restored later."
                            }
                          >
                            <Archive className="h-4 w-4" />
                          </ConfirmSubmitButton>
                        ) : null}
                        {expanded ? (
                          <ConfirmSubmitButton
                            action={actions.remove}
                            fields={{ noteId: entry.id, tab }}
                            label={
                              isId ? "Hapus permanen" : "Delete permanently"
                            }
                            title={
                              isId
                                ? `Hapus “${entry.title}”?`
                                : `Delete “${entry.title}”?`
                            }
                            description={
                              isId
                                ? "Tindakan ini tidak dapat dibatalkan."
                                : "This action cannot be undone."
                            }
                            destructive
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </ConfirmSubmitButton>
                        ) : null}
                      </div>
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer text-[10px] hover:bg-muted"
                            onClick={() => setSelectedTag(tag)}
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground sm:hidden">
                      {new Date(entry.createdAt).toLocaleDateString(
                        isId ? "id-ID" : "en-US",
                        { dateStyle: "medium" },
                      )}
                    </p>
                  </CardHeader>
                  {!expanded ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.content}
                    </p>
                  ) : null}
                  {expanded ? (
                    <CardContent className="space-y-3 p-0 pt-2">
                      {editing ? (
                        <form
                          action={async (fd) => {
                            await actions.update(fd);
                            setEditingId(null);
                          }}
                          className="space-y-3 rounded-md border bg-muted/30 p-3"
                        >
                          <input type="hidden" name="noteId" value={entry.id} />
                          <input type="hidden" name="tab" value={tab} />
                          <Input
                            name="title"
                            defaultValue={entry.title}
                            required
                            placeholder={isId ? "Judul" : "Title"}
                          />
                          <Input
                            name="tags"
                            defaultValue={entry.tags.join(", ")}
                            placeholder={
                              isId
                                ? "kerja, rapat, blocker"
                                : "work, meeting, blocker"
                            }
                          />
                          <MoodPicker
                            name="mood"
                            defaultValue={entry.mood}
                            lang={lang}
                          />
                          <Textarea
                            name="body"
                            rows={6}
                            defaultValue={entry.content}
                            required
                          />
                          <div className="flex gap-2">
                            <Button type="submit" size="sm">
                              {isId ? "Simpan" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              {isId ? "Batal" : "Cancel"}
                            </Button>
                          </div>
                        </form>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {entry.content}
                        </p>
                      )}
                    </CardContent>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MoodPicker({
  name,
  defaultValue = "",
  lang = "id",
}: {
  name: string;
  defaultValue?: string;
  lang?: string;
}) {
  const [selected, setSelected] = useState(defaultValue);
  const isId = lang !== "en";

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        <SmilePlus className="h-4 w-4" />
        {isId ? "Suasana" : "Mood"}
      </label>
      <div
        className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap"
        role="radiogroup"
      >
        {MOODS.map((m) => (
          <button
            key={m.emoji}
            type="button"
            className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-full border px-3 py-2 text-xs transition-colors ${
              selected === m.emoji
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
            onClick={() => setSelected(selected === m.emoji ? "" : m.emoji)}
            role="radio"
            aria-checked={selected === m.emoji}
            title={isId ? m.idLabel : m.en}
          >
            <span>{m.emoji}</span>
            <span className="hidden sm:inline">{isId ? m.idLabel : m.en}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}
