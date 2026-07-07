"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Download, SmilePlus } from "lucide-react";

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

export function JournalList({ entries }: { entries: JournalEntry[] }) {
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect all unique tags
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    entries.forEach((e) => e.tags.forEach((t) => tagSet.add(t)));
    return [...tagSet].sort();
  }, [entries]);

  // Filter entries
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
        const date = new Date(e.createdAt).toLocaleDateString("id-ID", { dateStyle: "full" });
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
      {/* Search + Export bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search journal entries..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={selectedTag === null ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setSelectedTag(null)}
          >
            All
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

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {entries.length} entries
        {search && ` matching "${search}"`}
        {selectedTag && ` tagged "${selectedTag}"`}
      </p>

      {/* Entries */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          {entries.length === 0 ? "Belum ada journal." : "Tidak ada entry yang cocok."}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <Card key={entry.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {entry.mood && <span className="text-lg">{entry.mood}</span>}
                    {entry.title}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                  </span>
                </div>
                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {entry.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px] cursor-pointer hover:bg-muted"
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

/* ── Mood picker for new entry form ── */

export function MoodPicker({ name }: { name: string }) {
  const [selected, setSelected] = useState("");

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <SmilePlus className="h-4 w-4" />
        Mood (optional)
      </label>
      <div className="flex flex-wrap gap-1.5">
        {MOODS.map((m) => (
          <button
            key={m.emoji}
            type="button"
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
              selected === m.emoji
                ? "bg-primary text-primary-foreground border-primary"
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
