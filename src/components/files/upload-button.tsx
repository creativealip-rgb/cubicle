"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadOneFile, MAX_UPLOAD_BYTES } from "@/lib/files-upload";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";

interface UploadButtonProps {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  folderId?: string;
}

export function UploadButton({ workspaceId, clientId, projectId, folderId }: UploadButtonProps) {
  const router = useRouter();
  const { t } = useT();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [fileType, setFileType] = useState<"working_file" | "deliverable">("working_file");

  function handleFileTypeChange(next: "working_file" | "deliverable") {
    setFileType(next);
    // Deliverable implies client-visible share.
    if (next === "deliverable") setVisibility("client");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t("Berkas harus di bawah 25MB", "File must be under 25MB"));
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      await uploadOneFile(
        file,
        { workspaceId, clientId, projectId, folderId, visibility, fileType },
        (pct) => setProgress(pct),
      );

      toast.success(
        fileType === "deliverable"
          ? t("Hasil kerja diunggah", "Deliverable uploaded")
          : t("File diunggah", "File uploaded"),
      );
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "MAX_SIZE") {
        toast.error(t("Berkas harus di bawah 25MB", "File must be under 25MB"));
      } else {
        toast.error(err instanceof Error ? err.message : t("Gagal mengunggah", "Upload failed"));
      }
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1" disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              {progress > 0 ? `${progress}%` : t("Mengunggah...", "Uploading...")}
            </>
          ) : (
            <>
              <Upload className="h-3 w-3" /> {t("Unggah", "Upload")}
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Unggah berkas", "Upload file")}</DialogTitle>
          <DialogDescription>
            {t("Pilih apakah ini file kerja internal atau hasil kerja untuk klien.", "Choose if this is internal work or a client deliverable.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("Visibilitas", "Visibility")}</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "internal" | "client")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">{t("Hanya internal", "Internal only")}</SelectItem>
                <SelectItem value="client">{t("Terlihat klien", "Client-visible")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("Tipe file", "File type")}</Label>
            <Select
              value={fileType}
              onValueChange={(v) => handleFileTypeChange(v as "working_file" | "deliverable")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working_file">{t("File kerja", "Working file")}</SelectItem>
                <SelectItem value="deliverable">{t("Hasil kerja", "Deliverable")}</SelectItem>
              </SelectContent>
            </Select>
            {fileType === "deliverable" && (
              <p className="text-[11px] text-muted-foreground">
                {t(
                  "Hasil kerja otomatis terlihat klien di portal.",
                  "Deliverables are auto-visible on the client portal.",
                )}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? `${progress || 0}%` : t("Pilih file", "Choose file")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
