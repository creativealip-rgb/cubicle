"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const isId = lang !== "en";

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [entries]);

  const filtered = useMemo(() => {
    return entries.filter((e) => {
      const matchSearch =
        !search ||
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.content.toLowerCase().includes(search.toLowerCase()) ||
        e.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchTag = !selectedTag || e.tags.includes(selectedTag);
      return matchSearch && matchTag;
    });
  }, [entries, search, selectedTag]);

  const handleExport = () => {
    const text = filtered
      .map((e) => {
        const date = new Date(e.createdAt).toLocaleDateString(isId ? "id-ID" : "en-US", {
          dateStyle: "full",
        });
        const tags = e.tags.length > 0 ? `Tags: ${e.tags.join(", ")}` : "";
        const mood = e.mood
          ? `Mood: ${e.mood} ${moodLabel(e.mood, isId)}`
          : "";
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[180px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isId ? "Cari entri jurnal…" : "Search journal entries…"}
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
          {isId ? "Ekspor" : "Export"}
        </Button>
      </div>

      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedTag(null)}
          >
            {isId ? "Semua tag" : "All tags"}
          </Button>
          {allTags.map((tag) => (
            <Button
              key={tag}
              variant={selectedTag === tag ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} / {entries.length} {isId ? "entri" : "entries"}
        {search && ` · “${search}”`}
        {selectedTag && ` · #${selectedTag}`}
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
        <div className="space-y-3">
          {filtered.map((entry) => {
            const editing = editingId === entry.id;
            return (
              <Card key={entry.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="flex min-w-0 items-center gap-2 text-base">
                      {entry.mood ? (
                        <span className="text-lg" title={moodLabel(entry.mood, isId)}>
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
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="mr-1 hidden text-xs text-muted-foreground sm:inline">
                        {new Date(entry.createdAt).toLocaleDateString(
                          isId ? "id-ID" : "en-US",
                          { dateStyle: "medium" },
                        )}
                      </span>
                      {tab !== "archived" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={isId ? "Ubah" : "Edit"}
                          onClick={() => setEditingId(editing ? null : entry.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      ) : null}
                      {tab === "archived" ? (
                        <form action={actions.restore}>
                          <input type="hidden" name="noteId" value={entry.id} />
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
                      ) : (
                        <form
                          action={actions.archive}
                          onSubmit={(e) => {
                            if (
                              !confirm(
                                isId
                                  ? "Arsipkan entri jurnal ini?"
                                  : "Archive this journal entry?",
                              )
                            ) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <input type="hidden" name="noteId" value={entry.id} />
                          <input type="hidden" name="tab" value="active" />
                          <Button
                            type="submit"
                            size="sm"
                            variant="ghost"
                            aria-label={isId ? "Arsipkan" : "Archive"}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        </form>
                      )}
                      <form
                        action={actions.remove}
                        onSubmit={(e) => {
                          if (
                            !confirm(
                              isId
                                ? "Hapus permanen entri jurnal ini?"
                                : "Permanently delete this journal entry?",
                            )
                          ) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <input type="hidden" name="noteId" value={entry.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <Button
                          type="submit"
                          size="sm"
                          variant="ghost"
                          aria-label={isId ? "Hapus" : "Delete"}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </form>
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
                <CardContent className="space-y-3">
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
                      <MoodPicker name="mood" defaultValue={entry.mood} lang={lang} />
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
              </Card>
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
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m.emoji}
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              selected === m.emoji
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            }`}
            onClick={() => setSelected(selected === m.emoji ? "" : m.emoji)}
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
