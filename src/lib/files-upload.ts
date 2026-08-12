import { quotaBlockMessage } from "@/lib/upload-quota-messages";

export interface UploadScope {
  workspaceId: string;
  clientId?: string;
  projectId?: string;
  folderId?: string;
  visibility?: "internal" | "client";
  fileType?: "working_file" | "deliverable";
}

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/** Extract the API error string (or quota-block code) from a failed upload. */
export function uploadErrorFromResponse(
  xhr: XMLHttpRequest,
  fallback: string,
): string {
  try {
    const data = JSON.parse(xhr.responseText || "{}");
    if (typeof data?.error === "string" && data.error) return data.error;
  } catch {
    // ignore unparseable body
  }
  return fallback;
}

export interface UploadedFileRecord {
  id: string;
  name: string;
  storageKey: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
}

/**
 * Upload a single file via same-origin proxy (server → R2).
 * Avoids browser CSP/CORS failures on direct R2 presigned PUT.
 * Shared by the Upload dialog, the drag-and-drop zone, and the document editor.
 * Resolves with the created file record when the upload succeeds.
 */
export async function uploadOneFile(
  file: File,
  scope: UploadScope,
  onProgress?: (pct: number) => void,
  lang: "id" | "en" = "id",
): Promise<UploadedFileRecord> {
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

  return new Promise<UploadedFileRecord>((resolve, reject) => {
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
          const record: UploadedFileRecord | undefined = data?.file;
          if (!record || !record.id || !record.storageKey) {
            reject(new Error("Upload response missing file record"));
            return;
          }
          resolve(record);
          return;
        } catch {
          // fall through to resolve path below only for unparseable bodies
        }
        reject(new Error("Upload response missing file record"));
        return;
      }
      const msg = uploadErrorFromResponse(
        xhr,
        `Upload failed: ${xhr.status}`,
      );
      reject(new Error(quotaBlockMessage(msg, lang) ?? msg));
    };
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(form);
  });
}
