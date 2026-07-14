import { getSignedUploadUrl, completeUpload } from "@/lib/actions/files";

export interface UploadScope {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  folderId?: string;
  visibility?: "internal" | "client";
  fileType?: "working_file" | "deliverable";
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * Upload a single file to R2 via a presigned PUT, then register it in the DB.
 * Shared by the Upload dialog and the drag-and-drop zone.
 */
export async function uploadOneFile(
  file: File,
  scope: UploadScope,
  onProgress?: (pct: number) => void,
): Promise<void> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("MAX_SIZE");
  }

  const mime = file.type || "application/octet-stream";
  const { uploadUrl, storageKey } = await getSignedUploadUrl({
    fileName: file.name,
    mime,
    size: file.size,
    workspaceId: scope.workspaceId,
    clientId: scope.clientId,
    projectId: scope.projectId,
    folderId: scope.folderId,
    visibility: scope.visibility ?? "internal",
    fileType: scope.fileType ?? "working_file",
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", mime);
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
    mimeType: mime,
    sizeBytes: file.size,
    workspaceId: scope.workspaceId,
    clientId: scope.clientId,
    projectId: scope.projectId,
    folderId: scope.folderId,
    visibility: scope.visibility ?? "internal",
    fileType: scope.fileType ?? "working_file",
  });
}
