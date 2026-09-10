"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { deleteFile, updateFileMeta } from "@/lib/actions/files";
import { formatFileDate } from "@/lib/file-manager-rules";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  Download,

  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,

  Search,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Folder,
  Users,
  FolderKanban,
  ArrowUpDown,

} from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  visibility: string;
  fileType: string;
  uploadedBy: string | null;
  uploaderName: string | null;
  createdAt: Date | string;
}

export interface FolderGridItem {
  id: string;
  name: string;
  type: "workspace_folder" | "client" | "project";
  href: string;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
  itemCount?: number;
  sizeBytes?: number | null;
}

interface FileListProps {
  files: FileItem[];
  folders?: FolderGridItem[];
  canWrite: boolean;
  lang: "id" | "en";
}

function getFileIcon(mimeType: string | null) {
  if (!mimeType) return <FileText className="h-5 w-5 text-muted-foreground" />;
  if (mimeType.startsWith("image/")) return <ImageIcon className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar"))
    return <FileArchive className="h-5 w-5 text-amber-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv") || mimeType.includes("excel"))
    return <FileSpreadsheet className="h-5 w-5 text-emerald-500" />;
  if (mimeType.includes("json") || mimeType.includes("javascript") || mimeType.includes("html"))
    return <FileCode className="h-5 w-5 text-purple-500" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

function formatBytes(bytes: number | null, unknownLabel: string): string {
  if (bytes === null) return unknownLabel;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const PAGE_SIZE = 10;

export function FileList({ files, folders = [], canWrite, lang }: FileListProps) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "internal" | "client" | "deliverable">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = folders;
    if (q) {
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return [...result].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      if (sortBy === "date") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === "size") {
        const sizeA = a.sizeBytes ?? 0;
        const sizeB = b.sizeBytes ?? 0;
        return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
      }
      return 0;
    });
  }, [folders, query, sortBy, sortOrder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result = files.filter((file) => {
      if (filter === "internal" && file.visibility !== "internal") return false;
      if (filter === "client" && file.visibility !== "client") return false;
      if (filter === "deliverable" && file.fileType !== "deliverable") return false;
      if (!q) return true;
      return file.name.toLowerCase().includes(q) ||
        (file.mimeType?.toLowerCase().includes(q) ?? false) ||
        (file.uploaderName?.toLowerCase().includes(q) ?? false);
    });

    return [...result].sort((a, b) => {
      if (sortBy === "name") {
        const cmp = a.name.localeCompare(b.name);
        return sortOrder === "asc" ? cmp : -cmp;
      }
      if (sortBy === "date") {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
      }
      if (sortBy === "size") {
        const sizeA = a.sizeBytes ?? 0;
        const sizeB = b.sizeBytes ?? 0;
        return sortOrder === "asc" ? sizeA - sizeB : sizeB - sizeA;
      }
      return 0;
    });
  }, [files, query, filter, sortBy, sortOrder]);


  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const combinedItems = useMemo(() => [
    ...filteredFolders.map((folder) => ({ kind: "folder" as const, folder })),
    ...filtered.map((file) => ({ kind: "file" as const, file })),
  ], [filteredFolders, filtered]);
  const totalPages = Math.max(1, Math.ceil(combinedItems.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return combinedItems.slice(start, start + PAGE_SIZE);
  }, [combinedItems, safePage]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setBusyId(deleteTarget.id);
      await deleteFile(deleteTarget.id);
      toast.success(t("Berkas dihapus", "File deleted"));
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus berkas", "Failed to delete file"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleVisibility(fileId: string, visibility: "internal" | "client") {
    try {
      setBusyId(fileId);
      await updateFileMeta({ fileId, visibility });
      toast.success(visibility === "client" ? t("Berkas dibagikan ke klien", "Shared with client") : t("Berkas menjadi internal", "Marked internal"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memperbarui", "Update failed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleFileType(fileId: string, fileType: "working_file" | "deliverable") {
    try {
      setBusyId(fileId);
      await updateFileMeta({ fileId, fileType });
      toast.success(fileType === "deliverable" ? t("Ditandai sebagai hasil kerja", "Marked as deliverable") : t("Ditandai sebagai berkas kerja", "Marked as working file"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memperbarui", "Update failed"));
    } finally {
      setBusyId(null);
    }
  }

  if (files.length === 0 && folders.length === 0) {
    return (
      <div className="space-y-4">
        {/* Drive Control Toolbar on Empty State */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("Cari berkas...", "Search files...")}
              className="h-9 rounded-xl pl-9 text-sm"
              disabled
            />
          </div>
          <div className="flex items-center gap-2">
            <Select value={`${sortBy}-${sortOrder}`} disabled>
              <SelectTrigger className="h-9 w-[150px] rounded-xl text-xs font-semibold">
                <div className="flex items-center gap-1.5 truncate">
                  <ArrowUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent align="end" className="rounded-xl">
                <SelectItem value="name-asc" className="text-xs">{t("Nama (A-Z)", "Name (A-Z)")}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-0.5">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setViewMode("grid")}
                title={t("Tampilan Grid", "Grid view")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => setViewMode("list")}
                title={t("Tampilan List", "List view")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/10 p-12 text-center shadow-2xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-3.5 text-sm font-bold text-foreground">
            {t("Belum ada berkas", "No files yet")}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
            {canWrite
              ? t(
                  "Gunakan tombol Unggah File atau drag & drop file ke area ini.",
                  "Use Upload File or drag and drop files into this area.",
                )
              : t("Belum ada berkas di dalam direktori ini.", "No files in this directory.")}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Cari folder dan file...", "Search folders and files...")} className="h-9 rounded-xl border-border/80 bg-background pl-9 text-sm" />
        </div>
        <div className="flex items-center gap-2">
          <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => { const [nextSort, nextOrder] = value.split("-") as [typeof sortBy, typeof sortOrder]; setSortBy(nextSort); setSortOrder(nextOrder); }}>
            <SelectTrigger className="h-9 w-[150px] rounded-xl border-border/80 text-xs font-semibold"><ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="name-asc">{t("Nama (A-Z)", "Name (A-Z)")}</SelectItem><SelectItem value="name-desc">{t("Nama (Z-A)", "Name (Z-A)")}</SelectItem><SelectItem value="date-desc">{t("Terbaru", "Newest first")}</SelectItem><SelectItem value="date-asc">{t("Terlama", "Oldest first")}</SelectItem><SelectItem value="size-desc">{t("Ukuran terbesar", "Largest size")}</SelectItem><SelectItem value="size-asc">{t("Ukuran terkecil", "Smallest size")}</SelectItem></SelectContent>
          </Select>
          <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><SelectTrigger className="h-9 w-[140px] rounded-xl border-border/80 text-xs font-semibold"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t("Semua", "All")}</SelectItem><SelectItem value="internal">{t("Internal", "Internal")}</SelectItem><SelectItem value="client">{t("Terlihat klien", "Client-visible")}</SelectItem><SelectItem value="deliverable">{t("Hasil kerja", "Deliverable")}</SelectItem></SelectContent></Select>
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-0.5"><Button type="button" variant="ghost" size="icon" className={cn("size-8 rounded-lg", viewMode === "grid" && "bg-background text-primary shadow-2xs")} onClick={() => setViewMode("grid")} aria-label={t("Tampilan Grid", "Grid view")}><LayoutGrid className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className={cn("size-8 rounded-lg", viewMode === "list" && "bg-background text-primary shadow-2xs")} onClick={() => setViewMode("list")} aria-label={t("Tampilan List", "List view")}><ListIcon className="size-4" /></Button></div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{t("Internal hanya untuk tim. Berkas klien dan hasil kerja tampil di portal.", "Internal files are team-only. Client files and deliverables appear in the portal.")}</p>
      {combinedItems.length === 0 ? <EmptyState icon={Search} title={t("Tidak ada item yang cocok", "No matching items")} description={t("Coba ubah kata kunci atau filter.", "Try a different keyword or filter.")} /> : <>
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("Semua item", "All items")} ({combinedItems.length})</p>
        {viewMode === "grid" ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedItems.map((item) => item.kind === "folder" ? (() => { const folder=item.folder; const Icon=folder.type === "client" ? Users : folder.type === "project" ? FolderKanban : Folder; return <a key={`folder-${folder.id}`} href={folder.href} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-muted/60"><Icon className="size-5 text-amber-500" /></div><ChevronRight className="size-4 text-muted-foreground" /></div><div><p className="truncate text-sm font-semibold" title={folder.name}>{folder.name}</p><p className="text-xs text-muted-foreground">{folder.type === "client" ? t("Klien", "Client") : folder.type === "project" ? t("Proyek", "Project") : t("Folder", "Folder")}</p></div></a>; })() : (() => { const file=item.file; const busy=busyId === file.id; return <div key={`file-${file.id}`} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-xl bg-muted/60">{getFileIcon(file.mimeType)}</div><div className="flex gap-1"><Button variant="ghost" size="icon" className="size-8" onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")} disabled={busy} aria-label={t(`Buka / Unduh ${file.name}`, `Open / Download ${file.name}`)}><Download className="size-4" /></Button>{canWrite && <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => setDeleteTarget(file)} disabled={busy} aria-label={t(`Hapus ${file.name}`, `Delete ${file.name}`)}><Trash2 className="size-4" /></Button>}</div></div><div><p className="truncate text-sm font-semibold" title={file.name}>{file.name}</p><p className="text-xs text-muted-foreground"><span className="font-mono">{formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}</span> · {formatFileDate(file.createdAt, lang)}</p></div>{canWrite && <div className="mt-2 flex gap-1.5 border-t pt-2"><Select value={file.visibility} onValueChange={(value) => handleVisibility(file.id, value as "internal" | "client")} disabled={busy}><SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="internal">{t("Internal", "Internal")}</SelectItem><SelectItem value="client">{t("Klien", "Client")}</SelectItem></SelectContent></Select><Select value={file.fileType} onValueChange={(value) => handleFileType(file.id, value as "working_file" | "deliverable")} disabled={busy}><SelectTrigger className="h-7 text-[11px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="working_file">{t("Berkas kerja", "Working")}</SelectItem><SelectItem value="deliverable">{t("Hasil kerja", "Deliverable")}</SelectItem></SelectContent></Select></div>}</div>; })())}
        </div> : <div className="overflow-hidden rounded-2xl border bg-card"><div className="divide-y">{paginatedItems.map((item) => item.kind === "folder" ? <a key={`folder-${item.folder.id}`} href={item.folder.href} className="flex h-11 items-center justify-between px-4 hover:bg-muted/30"><span className="flex min-w-0 items-center gap-3"><Folder className="size-4 shrink-0 text-amber-500" /><span className="truncate text-sm font-medium">{item.folder.name}</span></span><span className="text-xs text-muted-foreground">{t("Folder", "Folder")}</span></a> : <div key={`file-${item.file.id}`} className="flex h-11 items-center justify-between gap-3 px-4"><span className="flex min-w-0 items-center gap-3">{getFileIcon(item.file.mimeType)}<span className="truncate text-sm font-medium">{item.file.name}</span></span><Button variant="ghost" size="icon" className="size-8" onClick={() => window.open(`/api/files/${item.file.id}/download`, "_blank")} aria-label={t(`Buka / Unduh ${item.file.name}`, `Open / Download ${item.file.name}`)}><Download className="size-4" /></Button></div>)}</div></div>}
        {totalPages > 1 && <div className="flex items-center justify-between border-t pt-3"><Button variant="outline" size="sm" disabled={safePage <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" />{t("Sebelumnya", "Previous")}</Button><span className="text-xs text-muted-foreground">{t("Halaman", "Page")} {safePage} / {totalPages}</span><Button variant="outline" size="sm" disabled={safePage >= totalPages} onClick={() => setPage((value) => value + 1)}>{t("Berikutnya", "Next")}<ChevronRight className="size-4" /></Button></div>}
      </>}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Hapus berkas?", "Delete file?")}</DialogTitle>
            <DialogDescription>
              {t(`Berkas “${deleteTarget?.name ?? ""}” akan dihapus permanen dari penyimpanan.`, `“${deleteTarget?.name ?? ""}” will be permanently deleted from storage.`)}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={Boolean(busyId)}>{t("Batal", "Cancel")}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={Boolean(busyId)} className="gap-1">
              {busyId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {t("Hapus permanen", "Delete permanently")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
