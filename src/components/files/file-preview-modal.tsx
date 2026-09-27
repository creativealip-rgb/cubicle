"use client";

import { useState, useEffect } from "react";
import { useT } from "@/lib/i18n-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Loader2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
} from "lucide-react";

interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  visibility?: string | null;
  fileType?: string | null;
}

interface FilePreviewModalProps {
  file: FileItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token?: string | null;
}

export function FilePreviewModal({
  file,
  open,
  onOpenChange,
  token,
}: FilePreviewModalProps) {
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<{
    downloadUrl: string;
    textContent?: string | null;
    excelData?: Array<{ sheetName: string; rows: Array<Array<string | number | boolean | null>> }> | null;
  } | null>(null);

  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (!open || !file) {
      setPreviewData(null);
      setError(null);
      setLoading(true);
      setZoom(100);
      setRotation(0);
      setActiveSheetIndex(0);
      return;
    }

    setLoading(true);
    setError(null);

    const url = `/api/files/${file.id}/preview${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(t("Gagal memuat pratinjau file", "Failed to load file preview"));
        }
        return res.json();
      })
      .then((data) => {
        setPreviewData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || t("Terjadi kesalahan saat memuat berkas", "Error loading file"));
        setLoading(false);
      });
  }, [open, file, token, t]);

  if (!file) return null;

  const fileName = file.name.toLowerCase();
  const mime = (file.mimeType || "").toLowerCase();

  const isImage =
    mime.startsWith("image/") ||
    fileName.endsWith(".png") ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    fileName.endsWith(".webp") ||
    fileName.endsWith(".svg") ||
    fileName.endsWith(".gif");

  const isPdf = mime.includes("pdf") || fileName.endsWith(".pdf");

  const isVideo =
    mime.startsWith("video/") ||
    fileName.endsWith(".mp4") ||
    fileName.endsWith(".webm") ||
    fileName.endsWith(".mov");

  const isAudio =
    mime.startsWith("audio/") ||
    fileName.endsWith(".mp3") ||
    fileName.endsWith(".wav") ||
    fileName.endsWith(".ogg") ||
    fileName.endsWith(".m4a");

  const isExcel =
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls");

  const isText =
    mime.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".json") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv") ||
    fileName.endsWith(".srt") ||
    fileName.endsWith(".vtt") ||
    fileName.endsWith(".ts") ||
    fileName.endsWith(".js") ||
    fileName.endsWith(".py") ||
    fileName.endsWith(".html") ||
    fileName.endsWith(".css");

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[900px] max-w-[calc(100%-1.5rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl shadow-2xl rounded-2xl border-border/80 bg-background">
        {/* Top Header */}
        <DialogHeader className="shrink-0 border-b bg-muted/20 px-6 py-3.5 pr-14">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* File Info */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="truncate font-bold text-sm text-foreground" title={file.name}>
                {file.name}
              </span>
              <Badge variant="outline" className="text-[10px] font-semibold tracking-wide shrink-0">
                {formatFileSize(file.sizeBytes)}
              </Badge>
            </div>

            {/* Quick Controls & Download Button */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isImage && previewData?.downloadUrl && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setZoom((z) => Math.min(z + 25, 300))}
                    title={t("Perbesar", "Zoom In")}
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setZoom((z) => Math.max(z - 25, 25))}
                    title={t("Perkecil", "Zoom Out")}
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    title={t("Putar", "Rotate")}
                  >
                    <RotateCw className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}

              {previewData?.downloadUrl && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  className="h-8 gap-1.5 px-3 text-xs font-semibold rounded-lg shadow-xs"
                  onClick={() => window.open(previewData.downloadUrl, "_blank")}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t("Unduh", "Download")}</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Preview Viewport Canvas */}
        <div className="relative flex-1 min-h-0 overflow-hidden bg-muted/15 flex flex-col items-center justify-center p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-medium">{t("Memuat pratinjau...", "Loading preview...")}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2.5 text-center max-w-md p-6">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-semibold text-foreground">{error}</p>
              {previewData?.downloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(previewData.downloadUrl, "_blank")}
                  className="mt-2 text-xs"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  {t("Buka di Tab Baru", "Open in New Tab")}
                </Button>
              )}
            </div>
          ) : previewData ? (
            <div className="w-full h-full flex flex-col overflow-hidden items-center justify-center">
              {/* IMAGE VIEWER */}
              {isImage && (
                <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewData.downloadUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                      transition: "transform 0.15s ease-out",
                    }}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                  />
                </div>
              )}

              {/* PDF VIEWER */}
              {isPdf && (
                <div className="w-full h-full rounded-xl overflow-hidden border border-border/70 bg-background shadow-xs">
                  <iframe
                    src={`${previewData.downloadUrl}#toolbar=1`}
                    className="w-full h-full border-0"
                    title={file.name}
                  />
                </div>
              )}

              {/* VIDEO VIEWER */}
              {isVideo && (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <video
                    src={previewData.downloadUrl}
                    controls
                    autoPlay
                    className="max-h-full max-w-full rounded-xl shadow-lg border border-border/80 bg-black"
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}

              {/* AUDIO PLAYER */}
              {isAudio && (
                <div className="flex flex-col items-center justify-center gap-6 p-8 rounded-2xl border border-border/80 bg-card shadow-md max-w-lg w-full">
                  <div className="h-20 w-20 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <Music className="h-10 w-10" />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-bold text-sm text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(file.sizeBytes)}</p>
                  </div>
                  <audio src={previewData.downloadUrl} controls className="w-full" autoPlay />
                </div>
              )}

              {/* EXCEL / SPREADSHEET TABLE VIEWER */}
              {isExcel && previewData.excelData && previewData.excelData.length > 0 && (
                <div className="w-full h-full flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                  {/* Sheets tabs */}
                  {previewData.excelData.length > 1 && (
                    <div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-1.5 overflow-x-auto shrink-0">
                      {previewData.excelData.map((sheet, idx) => (
                        <button
                          key={sheet.sheetName || idx}
                          type="button"
                          onClick={() => setActiveSheetIndex(idx)}
                          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                            activeSheetIndex === idx
                              ? "bg-background text-primary shadow-xs border border-border"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {sheet.sheetName || `Sheet ${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Grid table */}
                  <div className="flex-1 overflow-auto p-2">
                    <table className="min-w-full border-collapse text-xs font-mono">
                      <tbody>
                        {previewData.excelData[activeSheetIndex]?.rows.map((row, rIdx) => (
                          <tr
                            key={rIdx}
                            className={`border-b border-border/50 ${
                              rIdx === 0 ? "bg-muted/60 font-bold sticky top-0" : "hover:bg-muted/20"
                            }`}
                          >
                            <td className="border-r border-border/40 px-2 py-1.5 text-[10px] text-muted-foreground/60 select-none text-right bg-muted/30 w-8">
                              {rIdx + 1}
                            </td>
                            {row.map((cell, cIdx) => (
                              <td
                                key={cIdx}
                                className="border-r border-border/40 px-3 py-1.5 whitespace-nowrap text-foreground/90 max-w-xs truncate"
                                title={String(cell ?? "")}
                              >
                                {String(cell ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TEXT / CODE / MARKDOWN VIEWER */}
              {isText && previewData.textContent !== undefined && (
                <div className="w-full h-full flex flex-col rounded-xl border border-border/80 bg-card overflow-hidden shadow-xs">
                  <div className="flex-1 overflow-auto p-4 bg-muted/20">
                    <pre className="text-xs font-mono leading-relaxed text-foreground whitespace-pre-wrap break-all">
                      {previewData.textContent}
                    </pre>
                  </div>
                </div>
              )}

              {/* FALLBACK (NO INLINE RENDER) */}
              {!isImage && !isPdf && !isVideo && !isAudio && !isExcel && !isText && (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-md">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-sm text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("Pratinjau langsung tidak didukung untuk tipe file ini.", "Direct inline preview not supported for this file type.")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="gap-2 font-semibold text-xs"
                    onClick={() => window.open(previewData.downloadUrl, "_blank")}
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>{t("Unduh untuk Membuka", "Download to Open")}</span>
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
