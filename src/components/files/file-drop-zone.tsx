"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { uploadOneFile, MAX_UPLOAD_BYTES, type UploadScope } from "@/lib/files-upload";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { UploadCloud, Loader2 } from "lucide-react";

interface FileDropZoneProps {
  scope: UploadScope;
  canWrite: boolean;
  children: React.ReactNode;
}

/**
 * Wraps the file list and turns the whole area into a drag-and-drop upload
 * target. Uploads sequentially, reports per-batch progress, then refreshes.
 */
export function FileDropZone({ scope, canWrite, children }: FileDropZoneProps) {
  const router = useRouter();
  const { t } = useT();
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [total, setTotal] = useState(0);
  // Guard against nested dragenter/dragleave flicker.
  const depth = useRef(0);

  const handleFiles = useCallback(
    async (fileList: FileList) => {
      const items = Array.from(fileList);
      if (items.length === 0) return;

      const tooBig = items.filter((f) => f.size > MAX_UPLOAD_BYTES);
      const valid = items.filter((f) => f.size <= MAX_UPLOAD_BYTES);
      if (tooBig.length > 0) {
        toast.error(
          t(
            `${tooBig.length} file dilewati (lebih dari 25MB)`,
            `${tooBig.length} file(s) skipped (over 25MB)`,
          ),
        );
      }
      if (valid.length === 0) return;

      setBusy(true);
      setTotal(valid.length);
      setDone(0);
      let ok = 0;
      for (const file of valid) {
        try {
          await uploadOneFile(file, scope);
          ok++;
          setDone(ok);
        } catch (err: unknown) {
          toast.error(
            `${file.name}: ${err instanceof Error ? err.message : t("gagal", "failed")}`,
          );
        }
      }
      setBusy(false);
      setTotal(0);
      setDone(0);
      if (ok > 0) {
        toast.success(
          t(`${ok} file diunggah`, `${ok} file(s) uploaded`),
        );
        router.refresh();
      }
    },
    [scope, router, t],
  );

  if (!canWrite) return <>{children}</>;

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        e.preventDefault();
        depth.current--;
        if (depth.current <= 0) {
          depth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "relative rounded-lg transition-colors",
        dragging && "outline-2 outline-dashed outline-primary bg-primary/5",
      )}
    >
      {(dragging || busy) && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary pointer-events-none">
          {busy ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">
                {t(`Mengunggah ${done}/${total}...`, `Uploading ${done}/${total}...`)}
              </p>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-primary" />
              <p className="text-sm font-medium">
                {t("Lepaskan file untuk mengunggah", "Drop files to upload")}
              </p>
            </>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
