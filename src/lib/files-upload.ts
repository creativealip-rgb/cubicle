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
 * Upload a single file via same-origin proxy (server → R2).
 * Avoids browser CSP/CORS failures on direct R2 presigned PUT.
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

  const form = new FormData();
  form.append("file", file);
  form.append("workspaceId", scope.workspaceId);
  if (scope.clientId) form.append("clientId", scope.clientId);
  if (scope.projectId) form.append("projectId", scope.projectId);
  if (scope.folderId) form.append("folderId", scope.folderId);
  form.append("visibility", scope.visibility ?? "internal");
  form.append("fileType", scope.fileType ?? "working_file");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    });
    xhr.open("POST", "/api/files/upload");
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText || "{}");
          if (data?.error) {
            reject(new Error(data.error));
            return;
          }
        } catch {
          // ok even if body empty
        }
        resolve();
        return;
      }
      let msg = `Upload failed: ${xhr.status}`;
      try {
        const data = JSON.parse(xhr.responseText || "{}");
        if (data?.error) msg = data.error;
      } catch {
        // ignore
      }
      reject(new Error(msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
