"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Tag, Loader2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createTimerTag, deleteTimerTag } from "@/lib/actions/tags";
import { useT } from "@/lib/i18n-client";

export function TimerTagsManager({
  initialTags,
}: {
  initialTags: Array<{ id: string; name: string; color: string | null }>;
}) {
  const { t } = useT();
  const [tags, setTags] = useState(initialTags);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [isPending, startTransition] = useTransition();

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
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="flex flex-col gap-3 sm:flex-row sm:items-center rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative flex-1">
          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("Nama tag baru (contoh: Research, Review, Meeting)", "New tag name (e.g. Research, Review, Meeting)")}
            className="pl-9 h-9"
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
          <Button type="submit" size="sm" disabled={isPending || !name.trim()} className="gap-1.5 h-9">
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {t("Tambah Tag", "Add Tag")}
          </Button>
        </div>
      </form>

      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-4 py-3 bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">{t("Daftar Tag Timer", "Timer Tags List")}</h3>
          </div>
          <span className="text-xs text-muted-foreground">{tags.length} {t("tag terdaftar", "registered tags")}</span>
        </div>
        {tags.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {t("Belum ada tag yang dibuat. Tambahkan tag di atas untuk digunakan pada time tracking.", "No tags created yet. Add tags above to use in time tracking.")}
          </div>
        ) : (
          <div className="divide-y">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: tag.color || "#6366f1" }}
                  />
                  <span className="text-sm font-medium text-foreground">{tag.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(tag.id, tag.name)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
