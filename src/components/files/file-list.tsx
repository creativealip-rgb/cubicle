"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deleteFile } from "@/lib/actions/files";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileSpreadsheet,
  FileCode,
  Download,
  Trash2,
  Eye,
  Lock,
  Search,
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
  workspaceId: string;
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
  if (!bytes) return unknownLabel;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

  // eslint-disable-next-line unused-imports/no-unused-vars
export function FileList({ files, workspaceId }: FileListProps) {
  const router = useRouter();
  const { t } = useT();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.mimeType?.toLowerCase().includes(q) ?? false) ||
        (f.uploaderName?.toLowerCase().includes(q) ?? false),
    );
  }, [files, query]);

  async function handleDelete(fileId: string) {
    try {
      await deleteFile(fileId);
      toast.success(t("Berkas dihapus", "File deleted"));
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus file", "Failed to delete file"));
    }
  }

  function handleDownload(fileId: string) {
    window.open(`/api/files/${fileId}/download`, "_blank");
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("Cari file...", "Search files...")}
          className="pl-9"
        />
      </div>

      {files.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
          {t("Belum ada file", "No files yet")}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
          {t("Tidak ada file yang cocok", "No matching files")}
        </div>
      ) : (
        <div className="space-y-2">
      {filtered.map((file) => (
        <Card key={file.id}>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {getFileIcon(file.mimeType)}
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                  <span className="truncate max-w-[160px]">{file.mimeType || t("Tidak diketahui", "Unknown")}</span>
                  <span>·</span>
                  <span>{formatBytes(file.sizeBytes, t("Tidak diketahui", "Unknown"))}</span>
                  <span>·</span>
                  <span className="truncate max-w-[100px]">{file.uploaderName || t("Tidak diketahui", "Unknown")}</span>
                  <span>·</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge variant="outline" className="text-[10px] gap-0.5">
                {file.visibility === "internal" ? (
                  <><Lock className="h-2.5 w-2.5" /> {t("Internal", "Internal")}</>
                ) : (
                  <><Eye className="h-2.5 w-2.5" /> {t("Klien", "Client")}</>
                )}
              </Badge>
              {file.fileType === "deliverable" && (
                <Badge className="text-[10px]">{t("Hasil Kerja", "Deliverable")}</Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1"
                onClick={() => handleDownload(file.id)}
                title={t("Buka file", "Open file")}
              >
                <Download className="h-3.5 w-3.5" /> {t("Buka", "Open")}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => handleDelete(file.id)}
                title={t("Hapus", "Delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
        </div>
      )}
    </div>
  );
}
