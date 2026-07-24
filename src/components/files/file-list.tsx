"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteFile, updateFileMeta } from "@/lib/actions/files";
import { formatFileDate } from "@/lib/file-manager-rules";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Upload,
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

interface FileListProps {
  files: FileItem[];
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

export function FileList({ files, canWrite, lang }: FileListProps) {
  const router = useRouter();
  const { t } = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "internal" | "client" | "deliverable">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileItem | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return files.filter((file) => {
      if (filter === "internal" && file.visibility !== "internal") return false;
      if (filter === "client" && file.visibility !== "client") return false;
      if (filter === "deliverable" && file.fileType !== "deliverable") return false;
      if (!q) return true;
      return file.name.toLowerCase().includes(q) ||
        (file.mimeType?.toLowerCase().includes(q) ?? false) ||
        (file.uploaderName?.toLowerCase().includes(q) ?? false);
    });
  }, [files, query, filter]);

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setBusyId(deleteTarget.id);
      await deleteFile(deleteTarget.id);
      toast.success(t("Berkas dihapus", "File deleted"));
      setDeleteTarget(null);
      router.refresh();
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
      router.refresh();
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
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal memperbarui", "Update failed"));
    } finally {
      setBusyId(null);
    }
  }

  if (files.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-14 text-center">
        <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-medium">{t("Belum ada berkas", "No files yet")}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          {canWrite ? t("Gunakan tombol Unggah atau tarik berkas ke area ini.", "Use Upload or drag files into this area.") : t("Berkas akan tampil di sini.", "Files will appear here.")}
        </p>
        {canWrite && <Upload className="mx-auto mt-4 h-5 w-5 text-primary" />}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Cari berkas...", "Search files...")} className="pl-9" />
        </div>
        <Select value={filter} onValueChange={(value) => setFilter(value as typeof filter)}>
          <SelectTrigger className="h-10 w-full sm:h-9 sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("Semua", "All")}</SelectItem>
            <SelectItem value="internal">{t("Internal", "Internal")}</SelectItem>
            <SelectItem value="client">{t("Terlihat klien", "Client-visible")}</SelectItem>
            <SelectItem value="deliverable">{t("Hasil kerja", "Deliverable")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("Internal hanya untuk tim. Berkas klien dan hasil kerja tampil di portal.", "Internal files are team-only. Client files and deliverables appear in the portal.")}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          <Search className="mx-auto mb-3 h-9 w-9 opacity-30" />
          {t("Tidak ada berkas yang cocok", "No matching files")}
        </div>
      ) : (
        <div className="divide-y overflow-hidden rounded-lg border bg-card">
          {filtered.map((file) => {
            const busy = busyId === file.id;
            return (
              <div key={file.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-muted">{getFileIcon(file.mimeType)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <span>{formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">{file.uploaderName || t("Tidak diketahui", "Unknown")}</span>
                      <span aria-hidden>·</span>
                      <span>{formatFileDate(file.createdAt, lang)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                  {canWrite && (
                    <>
                      <Select value={file.visibility} onValueChange={(value) => handleVisibility(file.id, value as "internal" | "client")} disabled={busy}>
                        <SelectTrigger className="h-9 w-[124px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="internal"><span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" /> {t("Internal", "Internal")}</span></SelectItem>
                          <SelectItem value="client"><span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {t("Klien", "Client")}</span></SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={file.fileType} onValueChange={(value) => handleFileType(file.id, value as "working_file" | "deliverable")} disabled={busy}>
                        <SelectTrigger className="h-9 w-[140px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="working_file">{t("Berkas kerja", "Working file")}</SelectItem>
                          <SelectItem value="deliverable"><span className="inline-flex items-center gap-1"><Package className="h-3 w-3" /> {t("Hasil kerja", "Deliverable")}</span></SelectItem>
                        </SelectContent>
                      </Select>
                    </>
                  )}
                  {file.fileType === "deliverable" && <Badge className="text-[10px]">{t("Hasil kerja", "Deliverable")}</Badge>}
                  <Button variant="outline" size="sm" className="h-9 gap-1" onClick={() => window.open(`/api/files/${file.id}/download`, "_blank")} disabled={busy}>
                    <Download className="h-3.5 w-3.5" /> {t("Buka", "Open")}
                  </Button>
                  {canWrite && (
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => setDeleteTarget(file)} aria-label={t(`Hapus ${file.name}`, `Delete ${file.name}`)} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
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
