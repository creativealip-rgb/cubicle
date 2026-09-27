"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Tag as TagIcon, Loader2, Bookmark, Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { createTimerTag, updateTimerTag, deleteTimerTag } from "@/lib/actions/tags";
import { useT } from "@/lib/i18n-client";

interface TagItem {
  id: string;
  name: string;
  color: string | null;
}

export function TimerTagsManager({
  initialTags,
}: {
  initialTags: TagItem[];
}) {
  const { t } = useT();
  const [tags, setTags] = useState<TagItem[]>(initialTags);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isPending, startTransition] = useTransition();

  // Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");

  const colorPresets = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#64748b"];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        const created = await createTimerTag({ name: name.trim(), color });
        setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setName("");
        toast.success(t("Tag berhasil dibuat", "Tag created successfully"));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("Gagal membuat tag", "Failed to create tag"));
      }
    });
  };

  const startEdit = (tag: TagItem) => {
    setEditingId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color || "#6366f1");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = (id: string) => {
    if (!editName.trim()) return;
    startTransition(async () => {
      try {
        const updated = await updateTimerTag({ id, name: editName.trim(), color: editColor });
        setTags((prev) =>
          prev.map((t) => (t.id === id ? { ...t, name: updated.name, color: updated.color } : t)).sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        toast.success(t("Tag berhasil diperbarui", "Tag updated successfully"));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("Gagal memperbarui tag", "Failed to update tag"));
      }
    });
  };

  const handleDelete = (id: string, tagName: string) => {
    if (!confirm(t(`Hapus tag "${tagName}"?`, `Delete tag "${tagName}"?`))) return;
    startTransition(async () => {
      try {
        await deleteTimerTag(id);
        setTags((prev) => prev.filter((item) => item.id !== id));
        toast.success(t("Tag dihapus", "Tag deleted"));
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : t("Gagal menghapus tag", "Failed to delete tag"));
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Create New Tag Bar */}
      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-2xl border border-border/80 bg-card p-3 shadow-xs">
        <div className="relative flex-1">
          <TagIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Nama tag baru (contoh: Research, Review, Meeting)", "New tag name (e.g. Research, Review, Meeting)")}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2">
            {colorPresets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full border transition-transform ${color === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>
          <Button type="submit" size="sm" disabled={isPending || !name.trim()} className="gap-1.5 h-9 text-xs">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t("Tambah Tag", "Add Tag")}
          </Button>
        </div>
      </form>

      {/* Modern Tag Grid & Inline Editor */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("Daftar Tag Timer", "Timer Tags")}</h3>
          </div>
          <span className="text-xs text-muted-foreground">{tags.length} {t("tag terdaftar", "registered tags")}</span>
        </div>

        {tags.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t("Belum ada tag yang dibuat. Tambahkan tag di atas untuk digunakan pada time tracking.", "No tags created yet. Add tags above to use in time tracking.")}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5 pt-1">
            {tags.map((tag) => {
              const isEditing = editingId === tag.id;
              const tagColor = tag.color || "#6366f1";

              if (isEditing) {
                return (
                  <div
                    key={tag.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-2 shadow-xs"
                  >
                    <Input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleSaveEdit(tag.id);
                        } else if (e.key === "Escape") {
                          cancelEdit();
                        }
                      }}
                      className="h-7 w-36 text-xs bg-background"
                    />
                    <div className="flex items-center gap-1">
                      {colorPresets.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`h-4 w-4 rounded-full border transition-transform ${editColor === c ? "scale-125 ring-2 ring-primary ring-offset-1" : "hover:scale-110"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      className="h-6 w-6 rounded-md"
                      disabled={isPending || !editName.trim()}
                      onClick={() => handleSaveEdit(tag.id)}
                    >
                      {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 rounded-md text-muted-foreground hover:bg-muted"
                      onClick={cancelEdit}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              }

              return (
                <div
                  key={tag.id}
                  className="group flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/80 hover:border-primary/40 px-3 py-1.5 text-xs font-medium shadow-2xs transition-all hover:bg-muted/30"
                  style={{ borderColor: `${tagColor}30`, backgroundColor: `${tagColor}08` }}
                >
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: tagColor }}
                  />
                  <span className="text-foreground font-medium" style={{ color: tagColor }}>{tag.name}</span>

                  <div className="flex items-center gap-0.5 ml-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => startEdit(tag)}
                      className="rounded-md p-1 hover:bg-black/10 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground transition-colors"
                      title={t("Edit tag", "Edit tag")}
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="rounded-md p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t("Hapus tag", "Delete tag")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
