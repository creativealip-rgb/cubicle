"use client";

import { useMemo, useState, useEffect } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { deleteFile, updateFileMeta } from "@/lib/actions/files";
import { formatFileDate } from "@/lib/file-manager-rules";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Eye,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Loader2,
  Lock,
  Package,
  Search,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Folder,
  Users,
  FolderKanban,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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

  function toggleSort(key: "name" | "date" | "size") {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(key);
      setSortOrder(key === "name" ? "asc" : "desc");
    }
  }

  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

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
  // Pure Folders View (at root / All Files)
  if (files.length === 0 && folders.length > 0) {
    return (
      <div className="space-y-4">
        {/* Drive Control Toolbar */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("Cari folder...", "Search folders...")}
              className="pl-9 h-9 text-sm rounded-xl border-border/80 bg-background"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <Select
              value={`${sortBy}-${sortOrder}`}
              onValueChange={(val) => {
                const [sb, so] = val.split("-") as ["name" | "date" | "size", "asc" | "desc"];
                setSortBy(sb);
                setSortOrder(so);
              }}
            >
              <SelectTrigger className="h-9 w-[150px] text-xs font-semibold rounded-xl border-border/80">
                <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">{t("Nama (A-Z)", "Name (A-Z)")}</SelectItem>
                <SelectItem value="name-desc">{t("Nama (Z-A)", "Name (Z-A)")}</SelectItem>
                <SelectItem value="date-desc">{t("Terbaru", "Newest first")}</SelectItem>
                <SelectItem value="date-asc">{t("Terlama", "Oldest first")}</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Switcher (Grid / List) */}
            <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-lg", viewMode === "grid" ? "bg-background text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode("grid")}
                aria-label={t("Tampilan Grid", "Grid view")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className={cn("h-8 w-8 rounded-lg", viewMode === "list" ? "bg-background text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}
                onClick={() => setViewMode("list")}
                aria-label={t("Tampilan List", "List view")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {filteredFolders.length === 0 ? (
          <EmptyState
            icon={Search}
            title={t("Tidak ada folder yang cocok", "No matching folders")}
            description={t("Coba ubah kata kunci pencarian.", "Try a different keyword.")}
          />
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Folder className="h-3.5 w-3.5 text-amber-500" />
              {t("Folder", "Folders")} ({filteredFolders.length})
            </p>

            {viewMode === "grid" ? (
              /* Google Drive Grid View for Folders */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredFolders.map((folder) => {
                  const Icon = folder.type === "client" ? Users : folder.type === "project" ? FolderKanban : Folder;
                  const iconColor = folder.type === "client" ? "text-blue-500" : folder.type === "project" ? "text-purple-500" : "text-amber-500";
                  return (
                    <a
                      key={folder.id}
                      href={folder.href}
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-border/80 bg-card p-4 shadow-2xs transition-all hover:border-primary/40 hover:bg-muted/30 hover:shadow-xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                          <Icon className={cn("h-5 w-5", iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors" title={folder.name}>
                            {folder.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {folder.type === "client" ? t("Klien", "Client") : folder.type === "project" ? t("Proyek", "Project") : t("Folder", "Folder")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </a>
                  );
                })}
              </div>
            ) : (
              /* Google Drive Listical Table View for Folders */
              <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      <th className="py-2.5 px-4 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("name")}>
                        <div className="flex items-center gap-1.5">
                          <span>{t("Nama", "Name")}</span>
                          {sortBy === "name" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)}
                        </div>
                      </th>
                      <th className="py-2.5 px-4 hidden sm:table-cell">{t("Tipe", "Type")}</th>
                      <th className="py-2.5 px-4 text-right">{t("Aksi", "Action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredFolders.map((folder) => {
                      const Icon = folder.type === "client" ? Users : folder.type === "project" ? FolderKanban : Folder;
                      const iconColor = folder.type === "client" ? "text-blue-500" : folder.type === "project" ? "text-purple-500" : "text-amber-500";
                      return (
                        <tr key={folder.id} className="group transition-colors hover:bg-muted/30">
                          <td className="py-3 px-4">
                            <a href={folder.href} className="flex items-center gap-3 min-w-0">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60">
                                <Icon className={cn("h-4 w-4", iconColor)} />
                              </div>
                              <span className="truncate font-semibold text-foreground group-hover:text-primary transition-colors" title={folder.name}>
                                {folder.name}
                              </span>
                            </a>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell text-xs text-muted-foreground capitalize">
                            {folder.type === "client" ? t("Klien", "Client") : folder.type === "project" ? t("Proyek", "Project") : t("Folder Workspace", "Workspace Folder")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <a
                              href={folder.href}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline px-2.5 py-1 rounded-lg hover:bg-primary/10 transition-colors"
                            >
                              <span>{t("Buka", "Open")}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Cari berkas...", "Search files...")}
            className="pl-9 h-9 text-sm rounded-xl border-border/80 bg-background"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Drive Sort Dropdown (Name, Date, Size) */}
          <Select
            value={`${sortBy}-${sortOrder}`}
            onValueChange={(val) => {
              const [sb, so] = val.split("-") as ["name" | "date" | "size", "asc" | "desc"];
              setSortBy(sb);
              setSortOrder(so);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] text-xs font-semibold rounded-xl border-border/80">
              <ArrowUpDown className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name-asc">{t("Nama (A-Z)", "Name (A-Z)")}</SelectItem>
              <SelectItem value="name-desc">{t("Nama (Z-A)", "Name (Z-A)")}</SelectItem>
              <SelectItem value="date-desc">{t("Terbaru", "Newest first")}</SelectItem>
              <SelectItem value="date-asc">{t("Terlama", "Oldest first")}</SelectItem>
              <SelectItem value="size-desc">{t("Ukuran terbesar", "Largest size")}</SelectItem>
              <SelectItem value="size-asc">{t("Ukuran terkecil", "Smallest size")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Visibility & Type Filter Dropdown */}
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as typeof filter)}
          >
            <SelectTrigger className="h-9 w-[140px] text-xs font-semibold rounded-xl border-border/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Semua", "All")}</SelectItem>
              <SelectItem value="internal">{t("Internal", "Internal")}</SelectItem>
              <SelectItem value="client">{t("Terlihat klien", "Client-visible")}</SelectItem>
              <SelectItem value="deliverable">{t("Hasil kerja", "Deliverable")}</SelectItem>
            </SelectContent>
          </Select>

          {/* Drive View Mode Switcher (Grid / List) */}
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/40 p-0.5 shadow-2xs">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-lg", viewMode === "grid" ? "bg-background text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode("grid")}
              aria-label={t("Tampilan Grid", "Grid view")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn("h-8 w-8 rounded-lg", viewMode === "list" ? "bg-background text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}
              onClick={() => setViewMode("list")}
              aria-label={t("Tampilan List", "List view")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("Internal hanya untuk tim. Berkas klien dan hasil kerja tampil di portal.", "Internal files are team-only. Client files and deliverables appear in the portal.")}
      </p>

      {filtered.length === 0 && filteredFolders.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("Tidak ada berkas yang cocok", "No matching files")}
          description={t("Coba ubah kata kunci atau filter.", "Try a different keyword or filter.")}
        />
      ) : (
        <div className="space-y-6">
          {/* 1. Folders Section (Google Drive Folder Pills / Cards) */}
          {filteredFolders.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Folder className="h-3.5 w-3.5 text-amber-500" />
                {t("Folder", "Folders")} ({filteredFolders.length})
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredFolders.map((folder) => {
                  const Icon = folder.type === "client" ? Users : folder.type === "project" ? FolderKanban : Folder;
                  const iconColor = folder.type === "client" ? "text-blue-500" : folder.type === "project" ? "text-purple-500" : "text-amber-500";
                  return (
                    <a
                      key={folder.id}
                      href={folder.href}
                      className="group flex items-center justify-between gap-2.5 rounded-2xl border border-border/80 bg-card p-3 shadow-2xs transition-all hover:border-primary/40 hover:bg-muted/30 hover:shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/60">
                          <Icon className={cn("h-4.5 w-4.5", iconColor)} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors" title={folder.name}>
                            {folder.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground capitalize">
                            {folder.type === "client" ? t("Klien", "Client") : folder.type === "project" ? t("Proyek", "Project") : t("Folder", "Folder")}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-40 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Files Section */}
          {filtered.length > 0 && (
            <div className="space-y-2.5">
              {filteredFolders.length > 0 && (
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  {t("Berkas", "Files")} ({filtered.length})
                </p>
              )}
              {viewMode === "grid" ? (
                /* Google Drive Style Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {paginated.map((file) => {
                    const busy = busyId === file.id;
                    return (
                      <div
                        key={file.id}
                        className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-3.5 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm"
                      >
                        {/* Card Top Preview / Icon */}
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground">
                            {getFileIcon(file.mimeType)}
                          </div>
                          <div className="flex items-center gap-1">
                            {file.fileType === "deliverable" && (
                              <Badge variant="warning" className="text-[10px] h-5 px-1.5 font-bold">
                                {t("Hasil kerja", "Deliverable")}
                              </Badge>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                              onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")}
                              disabled={busy}
                              title={t("Buka / Download", "Open / Download")}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg"
                                onClick={() => setDeleteTarget(file)}
                                disabled={busy}
                                title={t(`Hapus ${file.name}`, `Delete ${file.name}`)}
                              >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* File Name & Preview Card Area */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground" title={file.name}>
                            {file.name}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                            <span className="font-mono tabular-nums">{formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}</span>
                            <span>·</span>
                            <span>{formatFileDate(file.createdAt, lang)}</span>
                          </div>
                          {file.uploaderName && (
                            <p className="truncate text-[11px] text-muted-foreground/80 mt-0.5">
                              {t("oleh", "by")} {file.uploaderName}
                            </p>
                          )}
                        </div>

                        {/* Granular Visibility & Type Controls */}
                        {canWrite && (
                          <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-1.5">
                            <Select
                              value={file.visibility}
                              onValueChange={(value) => handleVisibility(file.id, value as "internal" | "client")}
                              disabled={busy}
                            >
                              <SelectTrigger className="h-7 text-[11px] px-2 rounded-lg border-border/70">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="internal">
                                  <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t("Internal", "Internal")}</span>
                                </SelectItem>
                                <SelectItem value="client">
                                  <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {t("Klien", "Client")}</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              value={file.fileType}
                              onValueChange={(value) => handleFileType(file.id, value as "working_file" | "deliverable")}
                              disabled={busy}
                            >
                              <SelectTrigger className="h-7 text-[11px] px-2 rounded-lg border-border/70">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="working_file">{t("Berkas kerja", "Working")}</SelectItem>
                                <SelectItem value="deliverable">
                                  <span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {t("Hasil kerja", "Deliverable")}</span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Traditional Linear Table / Listical View with Column Sorting */
                <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xs">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border/80 bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="py-2.5 px-4 cursor-pointer select-none hover:text-foreground" onClick={() => toggleSort("name")}>
                          <div className="flex items-center gap-1.5">
                            <span>{t("Nama Berkas", "File Name")}</span>
                            {sortBy === "name" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)}
                          </div>
                        </th>
                        <th className="py-2.5 px-3 cursor-pointer select-none hover:text-foreground hidden md:table-cell" onClick={() => toggleSort("size")}>
                          <div className="flex items-center gap-1.5">
                            <span>{t("Ukuran", "Size")}</span>
                            {sortBy === "size" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)}
                          </div>
                        </th>
                        <th className="py-2.5 px-3 cursor-pointer select-none hover:text-foreground hidden lg:table-cell" onClick={() => toggleSort("date")}>
                          <div className="flex items-center gap-1.5">
                            <span>{t("Tanggal", "Date")}</span>
                            {sortBy === "date" && (sortOrder === "asc" ? <ArrowUp className="h-3 w-3 text-primary" /> : <ArrowDown className="h-3 w-3 text-primary" />)}
                          </div>
                        </th>
                        <th className="py-2.5 px-3">{t("Pengaturan", "Controls")}</th>
                        <th className="py-2.5 px-4 text-right">{t("Aksi", "Action")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {paginated.map((file) => {
                        const busy = busyId === file.id;
                        return (
                          <tr key={file.id} className="group transition-colors hover:bg-muted/20">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60" aria-hidden>
                                  {getFileIcon(file.mimeType)}
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground" title={file.name}>{file.name}</p>
                                  <div className="md:hidden mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-mono">{formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}</span>
                                    <span>·</span>
                                    <span>{formatFileDate(file.createdAt, lang)}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-3 hidden md:table-cell font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}
                            </td>
                            <td className="py-3 px-3 hidden lg:table-cell text-xs text-muted-foreground whitespace-nowrap">
                              {formatFileDate(file.createdAt, lang)}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
                                {canWrite && (
                                  <>
                                    <Select value={file.visibility} onValueChange={(value) => handleVisibility(file.id, value as "internal" | "client")} disabled={busy}>
                                      <SelectTrigger className="h-7 w-[105px] text-[11px] font-medium rounded-lg border-border/70" aria-label={t("Visibilitas berkas", "File visibility")}><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="internal"><span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t("Internal", "Internal")}</span></SelectItem>
                                        <SelectItem value="client"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {t("Klien", "Client")}</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Select value={file.fileType} onValueChange={(value) => handleFileType(file.id, value as "working_file" | "deliverable")} disabled={busy}>
                                      <SelectTrigger className="h-7 w-[115px] text-[11px] font-medium rounded-lg border-border/70" aria-label={t("Tipe berkas", "File type")}><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="working_file">{t("Berkas kerja", "Working")}</SelectItem>
                                        <SelectItem value="deliverable"><span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {t("Hasil kerja", "Deliverable")}</span></SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </>
                                )}
                                {file.fileType === "deliverable" && <Badge variant="warning" className="text-[10px] h-5">{t("Hasil kerja", "Deliverable")}</Badge>}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center justify-end gap-1">
                                <Button variant="outline" size="sm" className="h-8 gap-1 rounded-lg text-xs font-medium border-border/70" onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")} disabled={busy}>
                                  <Download className="h-3.5 w-3.5" /> {t("Buka", "Open")}
                                </Button>
                                {canWrite && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-lg" onClick={() => setDeleteTarget(file)} aria-label={t(`Hapus ${file.name}`, `Delete ${file.name}`)} disabled={busy}>
                                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 border-t px-1 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                {t("Sebelumnya", "Previous")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("Halaman", "Page")} {safePage} / {totalPages}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                {t("Berikutnya", "Next")}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

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
