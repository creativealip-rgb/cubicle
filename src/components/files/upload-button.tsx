"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getSignedUploadUrl, completeUpload } from "@/lib/actions/files";
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState<"internal" | "client">("internal");
  const [fileType, setFileType] = useState<"working_file" | "deliverable">("working_file");

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error("Berkas harus di bawah 25MB");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const { uploadUrl, storageKey } = await getSignedUploadUrl({
        fileName: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        workspaceId,
        clientId,
        projectId,
        folderId,
        visibility,
        fileType,
      });

      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (evt) => {
        if (evt.lengthComputable) {
          setProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.open("PUT", uploadUrl);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(file);
      });

      await completeUpload({
        name: file.name,
        storageKey,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        workspaceId,
        clientId,
        projectId,
        folderId,
        visibility,
        fileType,
      });

      toast.success(fileType === "deliverable" ? "Deliverable uploaded" : "File uploaded");
      setOpen(false);
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
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
              {progress > 0 ? `${progress}%` : "Uploading..."}
            </>
          ) : (
            <>
              <Upload className="h-3 w-3" /> Upload
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Unggah berkas</DialogTitle>
          <DialogDescription>
            Choose if this is internal work or a client deliverable.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as "internal" | "client")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">Internal only</SelectItem>
                <SelectItem value="client">Client-visible</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>File type</Label>
            <Select value={fileType} onValueChange={(v) => setFileType(v as "working_file" | "deliverable")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="working_file">Working file</SelectItem>
                <SelectItem value="deliverable">Deliverable</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-1">
            {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            {uploading ? `${progress || 0}%` : "Choose file"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
