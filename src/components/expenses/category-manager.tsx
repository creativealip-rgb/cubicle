"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/expenses";
import { useT } from "@/lib/i18n-client";

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  isDefault?: boolean;
}

const PRESET_COLORS = [
  "#6647F0", "#0091FF", "#10B981", "#F59E0B", "#ED5F00",
  "#EF4444", "#EC4899", "#8B5CF6", "#64748B", "#0EA5E9",
];

interface CategoryManagerProps {
  workspaceId: string;
  categories: CategoryRow[];
  canWrite: boolean;
}

export function CategoryManager({ workspaceId, categories, canWrite }: CategoryManagerProps) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CategoryRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);

  function openCreate() {
    setEditing(null);
    setName("");
    setColor(PRESET_COLORS[0]);
    setOpen(true);
  }

  function openEdit(c: CategoryRow) {
    setEditing(c);
    setName(c.name);
    setColor(c.color);
    setOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      toast.error(t("Nama kategori wajib", "Category name required"));
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), color });
        toast.success(t("Kategori diperbarui", "Category updated"));
      } else {
        await createCategory({ workspaceId, name: name.trim(), color });
        toast.success(t("Kategori ditambahkan", "Category added"));
      }
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteCategory(deleteTarget.id);
      toast.success(t("Kategori dihapus", "Category deleted"));
      setDeleteTarget(null);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal", "Failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Tag className="h-4 w-4" />
          {t("Kategori", "Categories")}
          <span className="text-xs text-slate-500 font-normal">({categories.length})</span>
        </div>
        {canWrite && (
          <Button size="sm" variant="outline" className="h-8 gap-1" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5" />
            {t("Tambah", "Add")}
          </Button>
        )}
      </div>

      {categories.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">
          {t("Belum ada kategori.", "No categories yet.")}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-sm truncate">{c.name}</span>
              </div>
              {canWrite && (
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("Edit kategori", "Edit category")
                : t("Tambah kategori", "Add category")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{t("Nama", "Name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("Warna", "Color")}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-slate-900 scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
              <Input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-9 w-20 p-1 mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button size="sm" onClick={handleSave} disabled={loading}>
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              {t("Simpan", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("Hapus kategori?", "Delete category?")}</DialogTitle>
            <DialogDescription>
              {t(
                `Kategori "${deleteTarget?.name ?? ""}" akan dihapus. Pengeluaran terkait jadi tanpa kategori.`,
                `Category "${deleteTarget?.name ?? ""}" will be deleted. Related expenses become uncategorized.`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(null)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700" onClick={handleDelete} disabled={loading}>
              {loading ? t("Menghapus...", "Deleting...") : t("Hapus", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
