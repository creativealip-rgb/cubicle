"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createFolder, renameFolder, deleteFolder } from "@/lib/actions/folders";
import { useT } from "@/lib/i18n-client";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FolderPlus, MoreVertical, Pencil, Trash2, Loader2 } from "lucide-react";

// ─── New Folder button + dialog ───
export function NewFolderButton({
  workspaceId,
  clientId,
  projectId,
  parentId,
}: {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  parentId?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createFolder({
        name: name.trim(),
        workspaceId,
        clientId: clientId || null,
        projectId: projectId || null,
        parentId: parentId || null,
      });
      toast.success(t("Folder dibuat", "Folder created"));
      setName("");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat folder", "Failed to create folder"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-10 gap-1 sm:h-9">
          <FolderPlus className="h-3.5 w-3.5" /> {t("Folder Baru", "New Folder")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Buat folder baru", "Create new folder")}</DialogTitle>
          <DialogDescription>
            {t("Kelompokkan file di dalam folder.", "Group files inside a folder.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>{t("Nama folder", "Folder name")}</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("mis. Kontrak, Aset Desain", "e.g. Contracts, Design Assets")}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
          />
        </div>
        <DialogFooter>
          <Button onClick={handleCreate} disabled={saving || !name.trim()} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />}
            {t("Buat", "Create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Per-folder actions (rename / delete) ───
export function FolderRowActions({
  folderId,
  currentName,
}: {
  folderId: string;
  currentName: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [busy, setBusy] = useState(false);

  async function handleRename() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await renameFolder({ folderId, name: name.trim() });
      toast.success(t("Folder diubah", "Folder renamed"));
      setRenameOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengubah nama", "Failed to rename"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deleteFolder(folderId);
      toast.success(t("Folder dihapus", "Folder deleted"));
      setDeleteOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus folder", "Failed to delete folder"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 text-muted-foreground hover:text-foreground lg:h-8 lg:w-8"
            onClick={(e) => e.preventDefault()}
            aria-label={t(`Aksi folder ${currentName}`, `Actions for folder ${currentName}`)}
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              setName(currentName);
              setRenameOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5 mr-2" /> {t("Ubah nama", "Rename")}
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onSelect={(e) => { e.preventDefault(); setDeleteOpen(true); }}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> {t("Hapus", "Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Ubah nama folder", "Rename folder")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{t("Nama folder", "Folder name")}</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleRename} disabled={busy || !name.trim()} className="gap-1">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
              {t("Simpan", "Save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Hapus folder?", "Delete folder?")}</DialogTitle>
            <DialogDescription>
              {t(
                `Folder "${currentName}" akan dihapus. Folder harus kosong (tanpa file atau subfolder).`,
                `Folder "${currentName}" will be deleted. The folder must be empty (no files or subfolders).`,
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy}>
              {t("Batal", "Cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={busy} className="gap-1">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {t("Hapus", "Delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
