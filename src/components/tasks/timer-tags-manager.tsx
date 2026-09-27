"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Tag as TagIcon, Loader2, Edit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();

  // Edit Modal State
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("#6366f1");

  const colorPresets = [
    { label: "Indigo", value: "#6366f1" },
    { label: "Blue", value: "#3b82f6" },
    { label: "Emerald", value: "#10b981" },
    { label: "Amber", value: "#f59e0b" },
    { label: "Rose", value: "#ef4444" },
    { label: "Purple", value: "#8b5cf6" },
    { label: "Pink", value: "#ec4899" },
    { label: "Slate", value: "#64748b" },
  ];

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

  const openEditModal = (tag: TagItem) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color || "#6366f1");
  };

  const closeEditModal = () => {
    setEditingTag(null);
    setEditName("");
  };

  const handleSaveEdit = () => {
    if (!editingTag || !editName.trim()) return;
    startTransition(async () => {
      try {
        const updated = await updateTimerTag({ id: editingTag.id, name: editName.trim(), color: editColor });
        setTags((prev) =>
          prev.map((t) => (t.id === editingTag.id ? { ...t, name: updated.name, color: updated.color } : t)).sort((a, b) => a.name.localeCompare(b.name))
        );
        closeEditModal();
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

  const filteredTags = tags.filter((tag) =>
    tag.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <div className="w-full space-y-6">
      {/* Top Controls: Create & Search */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Create Tag Card */}
        <form
          onSubmit={handleAdd}
          className="lg:col-span-7 flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Buat Tag Baru", "Create New Tag")}
            </span>
            <div className="flex items-center gap-1.5">
              {colorPresets.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setColor(c.value)}
                  className={`h-4.5 w-4.5 rounded-full border transition-transform ${
                    color === c.value
                      ? "scale-125 ring-2 ring-primary ring-offset-1"
                      : "hover:scale-110 opacity-80 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <TagIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("Nama tag baru (contoh: Research, Review, Meeting)", "New tag name (e.g. Research, Review, Meeting)")}
                className="pl-9 h-9.5 text-xs bg-background"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              disabled={isPending || !name.trim()}
              className="gap-1.5 h-9.5 text-xs px-4"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t("Tambah", "Add")}
            </Button>
          </div>
        </form>

        {/* Quick Search & Summary Card */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t("Filter & Ringkasan", "Filter & Summary")}
            </span>
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
              {tags.length} {t("Tag Terdaftar", "Tags Registered")}
            </span>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Cari daftar tag...", "Search tags list...")}
              className="pl-9 h-9.5 text-xs bg-background"
            />
          </div>
        </div>
      </div>

      {/* Full Width Tags Grid Card */}
      <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {t("Katalog Tag Terdaftar", "Registered Tags Catalog")}
          </h3>
          {search && (
            <span className="text-xs text-muted-foreground">
              {filteredTags.length} {t("ditemukan", "found")}
            </span>
          )}
        </div>

        {tags.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            {t("Belum ada tag yang dibuat. Tambahkan tag di atas untuk digunakan pada pencatatan waktu.", "No tags created yet. Add tags above to use in time tracking.")}
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            {t(`Tidak ada tag dengan kata kunci "${search}"`, `No tags found matching "${search}"`)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {filteredTags.map((tag) => {
              const tagColor = tag.color || "#6366f1";

              return (
                <div
                  key={tag.id}
                  className="group flex items-center justify-between rounded-xl border border-border/70 bg-card hover:border-primary/50 px-3.5 py-3 text-xs font-medium shadow-2xs transition-all hover:shadow-xs"
                  style={{ borderLeftWidth: "4px", borderLeftColor: tagColor }}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: tagColor }}
                    />
                    <span className="truncate font-semibold text-foreground text-sm">{tag.name}</span>
                  </div>

                  <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => openEditModal(tag)}
                      className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      title={t("Edit tag", "Edit tag")}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(tag.id, tag.name)}
                      className="rounded-lg p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title={t("Hapus tag", "Delete tag")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clean Edit Tag Dialog */}
      <Dialog open={Boolean(editingTag)} onOpenChange={(open) => !open && closeEditModal()}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{t("Edit Tag Timer", "Edit Timer Tag")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("Nama Tag", "Tag Name")}</Label>
              <Input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("Nama tag...", "Tag name...")}
                className="h-9.5 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveEdit();
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">{t("Pilih Warna", "Select Color")}</Label>
              <div className="flex items-center gap-2 pt-1">
                {colorPresets.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setEditColor(c.value)}
                    className={`h-6 w-6 rounded-full border transition-transform ${
                      editColor === c.value
                        ? "scale-125 ring-2 ring-primary ring-offset-2"
                        : "hover:scale-110 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button type="button" variant="outline" onClick={closeEditModal} disabled={isPending}>
              {t("Batal", "Cancel")}
            </Button>
            <Button type="button" onClick={handleSaveEdit} disabled={isPending || !editName.trim()} className="gap-1.5">
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("Simpan Perubahan", "Save Changes")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
