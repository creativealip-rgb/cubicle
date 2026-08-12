export type DocumentBlockType = "heading" | "text" | "list" | "divider" | "placeholder" | "signature" | "image" | "attachment" | "table";

export type DocumentTableRow = string[];

export type DocumentBlock = {
  id: string;
  type: DocumentBlockType;
  content?: string;
  level?: 1 | 2 | 3;
  items?: string[];
  ordered?: boolean;
  src?: string;
  fileName?: string;
  fileId?: string;
  mimeType?: string;
  sizeBytes?: number;
  rows?: DocumentTableRow[];
};

const allowed: Record<"proposal" | "contract", DocumentBlockType[]> = {
  proposal: ["heading", "text", "list", "divider", "placeholder", "image", "attachment", "table"],
  contract: ["heading", "text", "list", "divider", "placeholder", "signature", "table"],
};

const KNOWN_TYPES = new Set(Object.values(allowed).flat());

/** True when the value is a well-formed document block of a known type. */
export function isDocumentBlock(value: unknown): value is DocumentBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<DocumentBlock>;
  if (typeof block.id !== "string" || !block.id) return false;
  if (typeof block.type !== "string" || !KNOWN_TYPES.has(block.type as DocumentBlockType)) return false;
  return true;
}

/** True when the block payload is safe to store and render. */
export function isSafeDocumentBlock(value: unknown): value is DocumentBlock {
  if (!isDocumentBlock(value)) return false;
  const block = value as Partial<DocumentBlock>;
  if (block.content !== undefined && typeof block.content !== "string") return false;
  if (block.level !== undefined && block.level !== 1 && block.level !== 2 && block.level !== 3) return false;
  if (block.items !== undefined && !Array.isArray(block.items)) return false;
  if (block.items !== undefined && !block.items.every((item) => typeof item === "string")) return false;
  if (block.ordered !== undefined && typeof block.ordered !== "boolean") return false;
  if (block.rows !== undefined && !isSafeTableRows(block.rows)) return false;
  if (block.src !== undefined && typeof block.src !== "string") return false;
  if (block.fileName !== undefined && typeof block.fileName !== "string") return false;
  if (block.fileId !== undefined && typeof block.fileId !== "string") return false;
  if (block.mimeType !== undefined && typeof block.mimeType !== "string") return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes < 0)) return false;
  return true;
}

function isSafeTableRows(rows: unknown): rows is DocumentTableRow[] {
  if (!Array.isArray(rows)) return false;
  if (rows.length > 50) return false;
  return rows.every(
    (row) =>
      Array.isArray(row) &&
      row.length <= 12 &&
      row.every((cell) => typeof cell === "string" && cell.length <= 500),
  );
}

/**
 * Filter raw (untrusted, e.g. from client JSON or legacy storage) input down to
 * well-formed blocks allowed for the document kind. Payload fields that fail
 * structural checks are dropped entirely so a malicious block cannot smuggle
 * scripts, oversized tables, or non-string cell values into storage.
 */
export function normalizeDocumentBlocks(value: unknown, kind: "proposal" | "contract"): DocumentBlock[] {
  if (!Array.isArray(value)) return [];
  const allowedTypes = allowed[kind];
  return value.filter((block): block is DocumentBlock => {
    if (!isSafeDocumentBlock(block)) return false;
    if (!allowedTypes.includes(block.type)) return false;
    if (block.type === "list" && !Array.isArray(block.items)) return false;
    if (block.type === "table" && !isSafeTableRows(block.rows)) return false;
    if (block.type === "image" || block.type === "attachment") {
      // Media blocks require at least one of src/fileId/fileName; otherwise
      // they are inert and rejected instead of rendering broken placeholders.
      const hasAny = Boolean(block.src || block.fileId || block.fileName);
      if (!hasAny) return false;
    }
    return true;
  });
}

export function defaultDocumentBlocks(kind: "proposal" | "contract"): DocumentBlock[] {
  return kind === "contract"
    ? [
        { id: crypto.randomUUID(), type: "heading", level: 1, content: "Perjanjian" },
        { id: crypto.randomUUID(), type: "text", content: "{{client_name}}" },
        { id: crypto.randomUUID(), type: "heading", level: 2, content: "Pasal 1" },
        { id: crypto.randomUUID(), type: "text", content: "" },
        { id: crypto.randomUUID(), type: "signature" },
      ]
    : [{ id: crypto.randomUUID(), type: "heading", level: 1, content: "Proposal" }, { id: crypto.randomUUID(), type: "text", content: "" }];
}

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "tiff", "ico"]);

function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
}

/** True when the block's src points at the same-origin file download proxy. */
export function isSameOriginMediaSrc(src: string): boolean {
  try {
    return new URL(src, "http://local.invalid").pathname.startsWith("/api/files/");
  } catch {
    return false;
  }
}

/**
 * Build a media block (`image` or `attachment`) from a workspace file record.
 *
 * The same-origin `src` (`/api/files/...`) is derived from the storage key so
 * the block passes `isSafeImageBlock` / `isSafeAttachmentMeta` and renders in
 * editor preview, public proposal, and (for attachments) the download link.
 * `fileId` is the workspace-scoped `files` row id, so the download route can
 * authorize access. Throws when the record is missing the fields a safe media
 * block needs.
 */
export function buildDocumentMediaBlock(
  kind: "image" | "attachment",
  file: {
    id: string;
    name: string;
    storageKey: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  },
): DocumentBlock {
  if (!file.id || !file.name || !file.storageKey) {
    throw new Error("Uploaded file record is incomplete");
  }
  const src = file.storageKey.startsWith("/")
    ? file.storageKey
    : `/api/files/raw/${file.storageKey}`;
  return {
    id: crypto.randomUUID(),
    type: kind,
    src,
    fileName: file.name,
    fileId: file.id,
    mimeType: file.mimeType ?? undefined,
    sizeBytes: file.sizeBytes ?? undefined,
  };
}

/** True when the attachment block carries safe metadata (id, name, mime, size). */
export function isSafeAttachmentMeta(block: DocumentBlock): boolean {
  if (!block.fileId) return false;
  const fileName = block.fileName ?? "";
  if (!fileName || fileName.length > 255) return false;
  if (block.mimeType !== undefined && (typeof block.mimeType !== "string" || block.mimeType.length > 200)) return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes < 0 || block.sizeBytes > 5 * 1024 * 1024 * 1024)) return false;
  return true;
}

/** True when the image block carries a safe, renderable reference. */
export function isSafeImageBlock(block: DocumentBlock): boolean {
  if (!block.src) return false;
  if (!isSameOriginMediaSrc(block.src)) return false;
  if (!block.fileId) return false;
  const ext = extensionOf(block.fileName ?? "");
  if (ext && !IMAGE_EXTENSIONS.has(ext)) return false;
  if (block.mimeType !== undefined && !/^image\/(png|jpeg|jpg|gif|webp|avif|bmp|tiff)$/i.test(block.mimeType)) return false;
  if (block.sizeBytes !== undefined && (typeof block.sizeBytes !== "number" || !Number.isFinite(block.sizeBytes) || block.sizeBytes <= 0 || block.sizeBytes > 50 * 1024 * 1024)) return false;
  return true;
}
