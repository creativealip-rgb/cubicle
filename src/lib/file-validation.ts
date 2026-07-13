/**
 * File upload validation — allowlist by extension + magic-byte sniffing.
 *
 * Used by public/token-based upload endpoints (client portal) where we cannot
 * trust the client-supplied MIME type or filename. Blocks active content
 * (HTML/SVG/scripts) that could be served back and executed in a victim's
 * browser, and rejects files whose real bytes don't match their extension.
 */

// Deliverable-friendly allowlist: docs, images, archives, media. NO html/svg/js.
const ALLOWED_EXTENSIONS = new Set([
  // images (raster only — svg excluded on purpose)
  "jpg", "jpeg", "png", "gif", "webp", "avif", "bmp", "tiff", "ico",
  // documents
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv", "rtf", "odt", "ods",
  // archives
  "zip", "rar", "7z", "tar", "gz",
  // media
  "mp4", "mov", "webm", "mp3", "wav", "ogg", "m4a",
  // design
  "psd", "ai", "sketch", "fig", "xd",
]);

// Magic-byte signatures keyed by extension group. Each entry: offset + bytes.
interface Signature {
  offset: number;
  bytes: number[];
}

const SIGNATURES: Record<string, Signature[]> = {
  jpg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  jpeg: [{ offset: 0, bytes: [0xff, 0xd8, 0xff] }],
  png: [{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }],
  gif: [{ offset: 0, bytes: [0x47, 0x49, 0x46, 0x38] }],
  webp: [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }], // RIFF (WEBP at offset 8)
  bmp: [{ offset: 0, bytes: [0x42, 0x4d] }],
  pdf: [{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }], // %PDF
  // ZIP-based (docx/xlsx/pptx/odt/ods are zip containers)
  zip: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] }],
  docx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  xlsx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  pptx: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  odt: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  ods: [{ offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }],
  // legacy MS Office (OLE2 compound)
  doc: [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  xls: [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  ppt: [{ offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] }],
  rar: [{ offset: 0, bytes: [0x52, 0x61, 0x72, 0x21] }],
  "7z": [{ offset: 0, bytes: [0x37, 0x7a, 0xbc, 0xaf] }],
  gz: [{ offset: 0, bytes: [0x1f, 0x8b] }],
  mp4: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }], // ....ftyp
  mov: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  m4a: [{ offset: 4, bytes: [0x66, 0x74, 0x79, 0x70] }],
  mp3: [{ offset: 0, bytes: [0x49, 0x44, 0x33] }], // ID3 (also allow raw frame below)
  wav: [{ offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }],
  ogg: [{ offset: 0, bytes: [0x4f, 0x67, 0x67, 0x53] }],
  webm: [{ offset: 0, bytes: [0x1a, 0x45, 0xdf, 0xa3] }],
  psd: [{ offset: 0, bytes: [0x38, 0x42, 0x50, 0x53] }],
};

// Extensions we allow without a strict magic-byte check (plain-text / ambiguous).
const TEXT_LIKE = new Set(["txt", "csv", "rtf", "ai", "sketch", "fig", "xd", "avif", "tiff", "ico"]);

function matchesSignature(buf: Uint8Array, sig: Signature): boolean {
  if (buf.length < sig.offset + sig.bytes.length) return false;
  for (let i = 0; i < sig.bytes.length; i++) {
    if (buf[sig.offset + i] !== sig.bytes[i]) return false;
  }
  return true;
}

export interface FileValidationResult {
  ok: boolean;
  reason?: string;
  extension: string;
}

/**
 * Validate an uploaded file's extension and magic bytes.
 * @param filename original filename (used to derive extension)
 * @param head first bytes of the file (>= 16 bytes recommended)
 */
export function validateUploadedFile(filename: string, head: Uint8Array): FileValidationResult {
  const ext = filename.includes(".") ? filename.split(".").pop()!.toLowerCase() : "";

  if (!ext || !ALLOWED_EXTENSIONS.has(ext)) {
    return { ok: false, reason: `Tipe file .${ext || "?"} tidak diizinkan`, extension: ext };
  }

  // mp3 raw-frame fallback (0xFF 0xFB / 0xFF 0xF3 / 0xFF 0xF2)
  if (ext === "mp3" && head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0) {
    return { ok: true, extension: ext };
  }

  const sigs = SIGNATURES[ext];
  if (!sigs) {
    // No signature defined; allow only if it's a known text-like/ambiguous type.
    if (TEXT_LIKE.has(ext)) return { ok: true, extension: ext };
    return { ok: false, reason: `Tidak bisa memverifikasi konten .${ext}`, extension: ext };
  }

  const matched = sigs.some((sig) => matchesSignature(head, sig));
  if (!matched) {
    return { ok: false, reason: `Isi file tidak cocok dengan ekstensi .${ext}`, extension: ext };
  }

  return { ok: true, extension: ext };
}
