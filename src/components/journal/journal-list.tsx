"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Archive, Download, Search, SmilePlus } from "lucide-react";

type JournalEntry = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  mood: string;
  content: string;
  createdAt: string;
};

const MOODS = [
  { emoji: "😊", label: "Happy" },
  { emoji: "😐", label: "Neutral" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "🤔", label: "Thinking" },
  { emoji: "😴", label: "Tired" },
  { emoji: "🔥", label: "On Fire" },
  { emoji: "😢", label: "Sad" },
  { emoji: "🎉", label: "Excited" },
];

export function JournalList({
  entries,
  archiveAction,
  lang = "id",
}: {
  entries: JournalEntry[];
  archiveAction?: (formData: FormData) => Promise<void>;
  lang?: "id" | "en";
}) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
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
        const mood = e.mood ? `Mood: ${e.mood}` : "";
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
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={isId ? "Cari entri jurnal…" : "Search journal entries…"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
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
            {isId ? "Semua" : "All"}
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
        <p className="py-8 text-center text-sm text-muted-foreground">
          {entries.length === 0
            ? isId
              ? "Belum ada jurnal."
              : "No journal entries yet."
            : isId
              ? "Tidak ada entri yang cocok."
              : "No matching entries."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {entry.mood && <span className="text-lg">{entry.mood}</span>}
                    {entry.title}
                  </CardTitle>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString(isId ? "id-ID" : "en-US", {
                        dateStyle: "medium",
                      })}
                    </span>
                    {archiveAction ? (
                      <form
                        action={archiveAction}
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
                        <Button type="submit" size="sm" variant="ghost" aria-label="Archive">
                          <Archive className="h-4 w-4" />
                        </Button>
                      </form>
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
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{entry.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export function MoodPicker({ name }: { name: string }) {
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-sm font-medium">
        <SmilePlus className="h-4 w-4" />
        Mood
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
            title={m.label}
          >
            <span>{m.emoji}</span>
            <span className="hidden sm:inline">{m.label}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={selected} />
    </div>
  );
}
