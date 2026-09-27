"use client";

import { useMemo, useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { deleteFile, bulkDeleteFiles, bulkMoveFiles } from "@/lib/actions/files";
import Link from "next/link";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FilePreviewModal } from "@/components/files/file-preview-modal";
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
  Search,
  Trash2,
  LayoutGrid,
  List as ListIcon,
  Folder,
  Users,
  FolderKanban,
  MoreVertical,
  FolderInput,
  CheckSquare,
  Square,
  X,
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
  crumbs?: { label: string; href: string }[];
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

const PAGE_SIZE = 30; // Google Drive style larger page size for continuous smooth scrolling

export function FileList({
  files,
  folders = [],
  crumbs = [],
  canWrite,
  lang: _lang,
}: FileListProps) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [viewMode, setViewMode] = useState<"list" | "grid">("list"); // Default to clean Linear / Google Drive list
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "internal" | "client" | "deliverable">("all");
  const [sortBy, setSortBy] = useState<"name" | "date" | "size">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);
  const [previewTarget, setPreviewTarget] = useState<FileItem | null>(null);

  // Multi-Select State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkMoveModalOpen, setBulkMoveModalOpen] = useState(false);
  const [targetMoveFolder, setTargetMoveFolder] = useState<string>("root");
  const [bulkMoving, setBulkMoving] = useState(false);

  const filteredFolders = useMemo(() => {
    const q = query.trim().toLowerCase();
    let result = folders;
    if (q) {
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [folders, query]);

  const filteredFiles = useMemo(() => {
    let result = files;
    if (filter !== "all") {
      result = result.filter((f) => f.visibility === filter);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") {
        cmp = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      } else if (sortBy === "date") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === "size") {
        cmp = (a.sizeBytes ?? 0) - (b.sizeBytes ?? 0);
      }
      return sortOrder === "asc" ? cmp : -cmp;
    });
    return result;
  }, [files, filter, query, sortBy, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredFiles.slice(start, start + PAGE_SIZE);
  }, [filteredFiles, currentPage]);

  const hasItems = filteredFolders.length > 0 || filteredFiles.length > 0;

  // Toggle selection
  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = paginatedFiles.map((f) => f.id);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0 || bulkDeleting) return;
    setBulkDeleting(true);
    try {
      const res = await bulkDeleteFiles(selectedIds);
      toast.success(
        t(
          `${res.count || selectedIds.length} berkas berhasil dihapus`,
          `${res.count || selectedIds.length} file(s) deleted successfully`
        )
      );
      setSelectedIds([]);
      setBulkDeleteConfirm(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus berkas", "Failed to delete files"));
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0 || bulkMoving) return;
    setBulkMoving(true);
    try {
      const folderTarget = targetMoveFolder === "root" ? null : targetMoveFolder;
      const res = await bulkMoveFiles(selectedIds, folderTarget);
      toast.success(
        t(
          `${res.count || selectedIds.length} berkas berhasil dipindahkan`,
          `${res.count || selectedIds.length} file(s) moved successfully`
        )
      );
      setSelectedIds([]);
      setBulkMoveModalOpen(false);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memindahkan berkas", "Failed to move files"));
    } finally {
      setBulkMoving(false);
    }
  };

  const handleBulkDownload = () => {
    selectedIds.forEach((id, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = `/api/files/${id}/download`;
        link.download = "";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 250);
    });
    toast.success(
      t(
        `Mengunduh ${selectedIds.length} berkas...`,
        `Downloading ${selectedIds.length} files...`
      )
    );
  };

  const handleDelete = async (file: FileItem) => {
    setBusyId(file.id);
    try {
      await deleteFile(file.id);
      toast.success(t("File berhasil dihapus", "File deleted successfully"));
      setSelectedIds((prev) => prev.filter((id) => id !== file.id));
      setDeleteTarget(null);
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus file", "Failed to delete file"));
    } finally {
      setBusyId(null);
    }
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const workspaceFolders = folders.filter((f) => f.type === "workspace_folder");

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden space-y-3">
      {/* Top Sticky Bar: Breadcrumb + Search + Filter + View Toggles */}
      <div className="shrink-0 space-y-2.5 rounded-2xl border border-border/70 bg-card/70 p-3 shadow-xs backdrop-blur-xs">
        {/* Breadcrumbs */}
        {crumbs.length > 0 && (
          <nav aria-label={t("Breadcrumb berkas", "File breadcrumb")} className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground pb-1 border-b border-border/40">
            {crumbs.map((crumb, i) => (
              <span key={`${crumb.href}-${i}`} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground/60" aria-hidden />}
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="font-bold text-foreground">{crumb.label}</span>
                ) : (
                  <Link href={crumb.href} scroll={false} className="transition-colors hover:text-foreground hover:underline">
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>
        )}

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-1 items-center gap-2 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={t("Cari di folder & berkas...", "Search folders and files...")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 h-8 text-xs rounded-xl bg-background border-border/80"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(val: "name" | "date" | "size") => setSortBy(val)}
            >
              <SelectTrigger className="h-8 w-[120px] text-xs rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{t("Nama (A-Z)", "Name (A-Z)")}</SelectItem>
                <SelectItem value="date">{t("Terbaru", "Date modified")}</SelectItem>
                <SelectItem value="size">{t("Ukuran", "Size")}</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter}
              onValueChange={(val: "all" | "internal" | "client" | "deliverable") => {
                setFilter(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[110px] text-xs rounded-xl bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("Semua", "All")}</SelectItem>
                <SelectItem value="internal">{t("Internal", "Internal")}</SelectItem>
                <SelectItem value="client">{t("Klien", "Client")}</SelectItem>
                <SelectItem value="deliverable">{t("Deliverable", "Deliverable")}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-xl border bg-background p-0.5 shadow-2xs">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setViewMode("list")}
                title={t("Tampilan List", "List view")}
              >
                <ListIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7 rounded-lg"
                onClick={() => setViewMode("grid")}
                title={t("Tampilan Grid", "Grid view")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Multi-Select Action Bar */}
      {selectedIds.length > 0 && (
        <div className="shrink-0 flex items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-background/95 p-2.5 shadow-lg backdrop-blur-md transition-all animate-in fade-in-50 slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSelectAllVisible}
              className="h-7 gap-1.5 text-xs font-semibold rounded-lg"
            >
              {paginatedFiles.every((f) => selectedIds.includes(f.id)) ? (
                <CheckSquare className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Square className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              <span>
                {t(
                  `${selectedIds.length} berkas dipilih`,
                  `${selectedIds.length} file(s) selected`
                )}
              </span>
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkDownload}
              className="h-7 gap-1.5 text-xs font-semibold rounded-lg"
            >
              <Download className="h-3 w-3" />
              <span>{t("Unduh", "Download")}</span>
            </Button>

            {canWrite && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBulkMoveModalOpen(true)}
                className="h-7 gap-1.5 text-xs font-semibold rounded-lg"
              >
                <FolderInput className="h-3 w-3 text-blue-500" />
                <span>{t("Pindahkan", "Move")}</span>
              </Button>
            )}

            {canWrite && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteConfirm(true)}
                className="h-7 gap-1.5 text-xs font-semibold rounded-lg shadow-xs"
              >
                <Trash2 className="h-3 w-3" />
                <span>{t("Hapus", "Delete")}</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedIds([])}
              className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              title={t("Batalkan pilihan", "Clear selection")}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Scrollable File & Folder Content Viewport (Google Drive Scroll Style) */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 pb-4">
        {!hasItems ? (
          <EmptyState
            icon={Folder}
            title={t("Tidak ada berkas", "No files found")}
            description={
              query
                ? t("Tidak ada file atau folder yang cocok dengan pencarian", "No files match your query")
                : t("Unggah file atau buat folder untuk memulai", "Upload a file or create a folder to get started")
            }
          />
        ) : viewMode === "list" ? (
          /* LIST VIEW (GOOGLE DRIVE STANDARD) */
          <div className="rounded-2xl border border-border/80 bg-card overflow-hidden shadow-xs">
            <table className="min-w-full divide-y divide-border/60 text-xs">
              <thead className="bg-muted/40 font-bold uppercase text-[10px] tracking-wider text-muted-foreground sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="w-8 px-3 py-2.5 text-left">
                    <button
                      type="button"
                      onClick={handleSelectAllVisible}
                      className="flex items-center cursor-pointer"
                    >
                      {paginatedFiles.length > 0 &&
                      paginatedFiles.every((f) => selectedIds.includes(f.id)) ? (
                        <CheckSquare className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Square className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">{t("Nama", "Name")}</th>
                  <th className="px-3 py-2.5 text-left hidden sm:table-cell">{t("Ukuran", "Size")}</th>
                  <th className="px-3 py-2.5 text-left hidden md:table-cell">{t("Akses", "Visibility")}</th>
                  <th className="px-3 py-2.5 text-right w-16">{t("Aksi", "Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 font-normal">
                {/* Folders in List */}
                {filteredFolders.map((f) => (
                  <tr
                    key={`folder-${f.id}`}
                    className="hover:bg-muted/30 transition-colors cursor-pointer group"
                    onClick={() => (window.location.href = f.href)}
                  >
                    <td className="px-3 py-2"></td>
                    <td className="px-3 py-2 flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        {f.type === "client" ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : f.type === "project" ? (
                          <FolderKanban className="h-3.5 w-3.5" />
                        ) : (
                          <Folder className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <span className="font-semibold text-foreground group-hover:text-primary truncate max-w-xs md:max-w-md">
                        {f.name}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">
                      {f.itemCount !== undefined ? `${f.itemCount} items` : "—"}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">Folder</td>
                    <td className="px-3 py-2 text-right">
                      <ChevronRight className="h-3.5 w-3.5 inline-block text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
                    </td>
                  </tr>
                ))}

                {/* Files in List */}
                {paginatedFiles.map((file) => {
                  const isSelected = selectedIds.includes(file.id);
                  return (
                    <tr
                      key={`file-${file.id}`}
                      className={cn(
                        "hover:bg-muted/30 transition-colors cursor-pointer group",
                        isSelected && "bg-primary/5 font-medium"
                      )}
                      onClick={() => setPreviewTarget(file)}
                    >
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(file.id, e)}
                          className="flex items-center cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <Square className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-2 flex items-center gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
                          {getFileIcon(file.mimeType)}
                        </div>
                        <span
                          className="truncate text-foreground group-hover:text-primary font-medium max-w-xs md:max-w-md"
                          title={file.name}
                        >
                          {file.name}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell font-mono">
                        {formatFileSize(file.sizeBytes)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell capitalize">
                        {file.visibility}
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md">
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="text-xs">
                            <DropdownMenuItem onClick={() => setPreviewTarget(file)}>
                              <Eye className="h-3.5 w-3.5 mr-2" />
                              {t("Pratinjau", "Preview")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                window.open(`/api/files/${file.id}/download`, "_blank");
                              }}
                            >
                              <Download className="h-3.5 w-3.5 mr-2" />
                              {t("Unduh", "Download")}
                            </DropdownMenuItem>
                            {canWrite && (
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget(file)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                {t("Hapus", "Delete")}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* GRID VIEW */
          <div className="space-y-6">
            {/* Folders Section */}
            {filteredFolders.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {t("Folder", "Folders")} ({filteredFolders.length})
                </p>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {filteredFolders.map((f) => (
                    <a
                      key={f.id}
                      href={f.href}
                      className="group relative flex items-center gap-2.5 rounded-xl border border-border/80 bg-card p-3 shadow-xs hover:border-primary/50 hover:bg-accent/40 transition-all"
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:scale-105 transition-transform">
                        {f.type === "client" ? (
                          <Users className="h-3.5 w-3.5" />
                        ) : f.type === "project" ? (
                          <FolderKanban className="h-3.5 w-3.5" />
                        ) : (
                          <Folder className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-foreground group-hover:text-primary">
                          {f.name}
                        </p>
                        {f.itemCount !== undefined && (
                          <p className="text-[10px] text-muted-foreground">
                            {f.itemCount} {t("item", "items")}
                          </p>
                        )}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Files Section */}
            {filteredFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {t("Berkas", "Files")} ({filteredFiles.length})
                  </p>
                  <button
                    type="button"
                    onClick={handleSelectAllVisible}
                    className="text-xs text-primary font-medium hover:underline cursor-pointer"
                  >
                    {paginatedFiles.every((f) => selectedIds.includes(f.id))
                      ? t("Batal Pilih Halaman Ini", "Deselect Page")
                      : t("Pilih Halaman Ini", "Select Page")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                  {paginatedFiles.map((file) => {
                    const isSelected = selectedIds.includes(file.id);
                    return (
                      <div
                        key={file.id}
                        onClick={() => setPreviewTarget(file)}
                        className={cn(
                          "group relative flex flex-col justify-between rounded-xl border p-3 shadow-xs transition-all cursor-pointer bg-card",
                          isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-md"
                            : "border-border/80 hover:border-primary/50 hover:bg-accent/40"
                        )}
                      >
                        {/* Top Bar inside Card: Icon + Checkbox + Dropdown */}
                        <div className="flex items-start justify-between gap-1 mb-2">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => handleToggleSelect(file.id, e)}
                              className={cn(
                                "rounded p-0.5 transition-opacity",
                                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                              )}
                            >
                              {isSelected ? (
                                <CheckSquare className="h-3.5 w-3.5 text-primary" />
                              ) : (
                                <Square className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              )}
                            </button>
                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted group-hover:bg-background transition-colors">
                              {getFileIcon(file.mimeType)}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger
                              asChild
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <MoreVertical className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => setPreviewTarget(file)}>
                                <Eye className="h-3.5 w-3.5 mr-2" />
                                {t("Pratinjau", "Preview")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  window.open(`/api/files/${file.id}/download`, "_blank");
                                }}
                              >
                                <Download className="h-3.5 w-3.5 mr-2" />
                                {t("Unduh", "Download")}
                              </DropdownMenuItem>
                              {canWrite && (
                                <DropdownMenuItem
                                  onClick={() => setDeleteTarget(file)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  {t("Hapus", "Delete")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* File Name & Meta */}
                        <div className="space-y-1">
                          <p
                            className="truncate text-xs font-semibold text-foreground group-hover:text-primary"
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>{formatFileSize(file.sizeBytes)}</span>
                            <span className="capitalize">{file.visibility}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Pagination */}
      {totalPages > 1 && (
        <div className="shrink-0 flex items-center justify-between pt-1 border-t border-border/40 text-xs text-muted-foreground">
          <p>
            {t("Halaman", "Page")} {currentPage} {t("dari", "of")} {totalPages} ({filteredFiles.length} {t("berkas", "files")})
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs gap-1 rounded-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>{t("Sebelumnya", "Previous")}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-7 text-xs gap-1 rounded-lg"
            >
              <span>{t("Berikutnya", "Next")}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Single File Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("Hapus Berkas", "Delete File")}</DialogTitle>
            <DialogDescription>
              {t(
                `Apakah Anda yakin ingin menghapus "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`,
                `Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={!!busyId}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              {busyId ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("Hapus Sekarang", "Delete Now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirm Dialog */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("Hapus Masal Berkas", "Bulk Delete Files")}</DialogTitle>
            <DialogDescription>
              {t(
                `Apakah Anda yakin ingin menghapus ${selectedIds.length} berkas yang dipilih secara permanen?`,
                `Are you sure you want to permanently delete the ${selectedIds.length} selected files?`
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkDeleteConfirm(false)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={bulkDeleting}
              onClick={handleBulkDelete}
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("Hapus Semua Terpilih", "Delete All Selected")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Move Modal Dialog */}
      <Dialog open={bulkMoveModalOpen} onOpenChange={setBulkMoveModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{t("Pindahkan Berkas Terpilih", "Move Selected Files")}</DialogTitle>
            <DialogDescription>
              {t(
                `Pilih folder tujuan untuk memindahkan ${selectedIds.length} berkas terpilih:`,
                `Select destination folder for the ${selectedIds.length} selected files:`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-3">
            <Select value={targetMoveFolder} onValueChange={setTargetMoveFolder}>
              <SelectTrigger className="w-full text-xs rounded-xl">
                <SelectValue placeholder={t("Pilih Folder Tujuan", "Select Target Folder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">
                  📁 {t("Root / Tanpa Folder", "Root / No Folder")}
                </SelectItem>
                {workspaceFolders.map((wf) => (
                  <SelectItem key={wf.id} value={wf.id}>
                    📁 {wf.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setBulkMoveModalOpen(false)}>
              {t("Batal", "Cancel")}
            </Button>
            <Button
              variant="default"
              size="sm"
              disabled={bulkMoving}
              onClick={handleBulkMove}
            >
              {bulkMoving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {t("Pindahkan Sekarang", "Move Now")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* In-App File Preview Modal */}
      <FilePreviewModal
        file={previewTarget}
        open={!!previewTarget}
        onOpenChange={(open) => !open && setPreviewTarget(null)}
      />
    </div>
  );
}
