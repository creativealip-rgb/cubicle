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

function getReadingTime(text: string, isId: boolean) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return {
    words,
    label: isId ? `${words} kata · ${minutes} mnt baca` : `${words} words · ${minutes} min read`
  };
}

function getMonthYearHeader(dateStr: string, isId: boolean) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(isId ? "id-ID" : "en-US", { month: "long", year: "numeric" });
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
              className="min-h-8 gap-1 rounded-xl text-xs"
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
                  ? "Belum ada jurnal. Tulis entri pertama dengan tombol di atas."
                  : "No journal entries yet. Write your first entry above."
              : isId
                ? "Tidak ada entri yang cocok."
                : "No matching entries."}
          </p>
        </div>
      ) : (
        <div className="space-y-6" data-ui="journal-timeline-list">
          {filtered.map((entry, idx) => {
            const editing = editingId === entry.id;
            const expanded = expandedId === entry.id || editing;
            const currentMonth = getMonthYearHeader(entry.createdAt, isId);
            const prevMonth = idx > 0 ? getMonthYearHeader(filtered[idx - 1].createdAt, isId) : null;
            const showMonthHeader = currentMonth && currentMonth !== prevMonth;
            const readingInfo = getReadingTime(entry.content, isId);

            return (
              <div key={entry.id} className="space-y-3">
                {showMonthHeader && (
                  <div className="flex items-center gap-3 py-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                      {currentMonth}
                    </span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}

                <article className="relative py-2 pl-7 pr-1 sm:pl-9 transition rounded-2xl hover:bg-muted/20">
                  <span className="absolute left-1.5 top-3.5 h-3 w-3 rounded-full border-2 border-background bg-violet-600 sm:left-2.5" />
                  <span className="absolute bottom-0 left-[9px] top-6 w-px bg-border sm:left-[13px]" />
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
                        <CardTitle className="flex min-w-0 flex-wrap items-center gap-2 text-base">
                          {entry.mood ? (
                            <span
                              className="text-lg"
                              title={moodLabel(entry.mood, isId)}
                            >
                              {entry.mood}
                            </span>
                          ) : null}
                          <span className="font-semibold tracking-tight text-foreground truncate">
                            {entry.title}
                          </span>
                          {entry.status === "archived" ? (
                            <Badge variant="outline" className="text-[10px]">
                              {isId ? "Arsip" : "Archived"}
                            </Badge>
                          ) : null}
                          <span className="text-[11px] font-normal text-muted-foreground">
                            · {readingInfo.label}
                          </span>
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
                    </CardHeader>

                    {/* Preview / Content */}
                    {!expanded ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed pt-0.5">
                        {entry.content}
                      </p>
                    ) : null}
                  </div>

                  {/* Expanded Body Content */}
                  {expanded && !editing ? (
                    <CardContent className="space-y-3 p-0 pt-2 text-sm text-foreground leading-relaxed">
                      <p className="whitespace-pre-wrap">{entry.content}</p>

                      {entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {entry.tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="text-[11px] font-normal"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  ) : null}

                  {/* Inline Edit Form */}
                  {editing ? (
                    <CardContent className="p-0 pt-3">
                      <form
                        action={async (formData) => {
                          await actions.update(formData);
                          setEditingId(null);
                        }}
                        className="space-y-3 rounded-2xl border bg-muted/20 p-4"
                      >
                        <input type="hidden" name="noteId" value={entry.id} />
                        <input type="hidden" name="tab" value={tab} />
                        <div className="space-y-1">
                          <label
                            htmlFor={`edit-title-${entry.id}`}
                            className="text-xs font-semibold"
                          >
                            {isId ? "Judul" : "Title"}
                          </label>
                          <Input
                            id={`edit-title-${entry.id}`}
                            name="title"
                            defaultValue={entry.title}
                            required
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor={`edit-tags-${entry.id}`}
                            className="text-xs font-semibold"
                          >
                            {isId ? "Tag (pisahkan koma)" : "Tags (comma separated)"}
                          </label>
                          <Input
                            id={`edit-tags-${entry.id}`}
                            name="tags"
                            defaultValue={entry.tags.join(", ")}
                            className="rounded-xl"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold">
                            {isId ? "Mood" : "Mood"}
                          </label>
                          <div className="flex flex-wrap gap-1.5">
                            {MOODS.map((m) => (
                              <label
                                key={m.emoji}
                                className="flex cursor-pointer items-center gap-1 rounded-lg border px-2 py-1 text-xs"
                              >
                                <input
                                  type="radio"
                                  name="mood"
                                  value={m.emoji}
                                  defaultChecked={entry.mood === m.emoji}
                                  className="sr-only"
                                />
                                <span>{m.emoji}</span>
                                <span className="text-[11px]">
                                  {isId ? m.idLabel : m.en}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label
                            htmlFor={`edit-body-${entry.id}`}
                            className="text-xs font-semibold"
                          >
                            {isId ? "Isi Jurnal" : "Content"}
                          </label>
                          <Textarea
                            id={`edit-body-${entry.id}`}
                            name="body"
                            defaultValue={entry.content}
                            rows={6}
                            required
                            className="rounded-xl"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => setEditingId(null)}
                          >
                            {isId ? "Batal" : "Cancel"}
                          </Button>
                          <Button size="sm" className="rounded-xl bg-violet-600 text-white hover:bg-violet-700">
                            {isId ? "Simpan Perubahan" : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </CardContent>
                  ) : null}
                </article>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
