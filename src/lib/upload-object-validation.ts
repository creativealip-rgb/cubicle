import { createHash } from "node:crypto";

export type UploadObjectExpectation = {
  expectedBytes: number;
  maxBytes: number;
  expectedMime: string;
  expectedSha256?: string | null;
};

function magicType(bytes: Uint8Array) {
  const hex = Buffer.from(bytes).toString("hex");
  if (hex.startsWith("25504446")) return "application/pdf";
  if (hex.startsWith("ffd8ff")) return "image/jpeg";
  if (hex.startsWith("89504e470d0a1a0a")) return "image/png";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return "image/webp";
  return null;
}

export async function validateUploadObjectStream(
  body: AsyncIterable<Uint8Array>,
  expected: UploadObjectExpectation,
) {
  const hash = createHash("sha256");
  const prefix = Buffer.alloc(12);
  let prefixLength = 0;
  let bytes = 0;

  for await (const chunk of body) {
    bytes += chunk.byteLength;
    if (bytes > expected.maxBytes) throw new Error("OBJECT_TOO_LARGE");
    hash.update(chunk);
    if (prefixLength < prefix.length) {
      const copyLength = Math.min(prefix.length - prefixLength, chunk.byteLength);
      Buffer.from(chunk).copy(prefix, prefixLength, 0, copyLength);
      prefixLength += copyLength;
    }
  }

  if (bytes !== expected.expectedBytes) throw new Error("OBJECT_SIZE_MISMATCH");
  const detectedMime = magicType(prefix.subarray(0, prefixLength));
  if (detectedMime !== expected.expectedMime) throw new Error("OBJECT_MIME_MISMATCH");
  const sha256 = hash.digest("hex");
  if (expected.expectedSha256 && sha256 !== expected.expectedSha256.toLowerCase()) throw new Error("OBJECT_CHECKSUM_MISMATCH");
  return { bytes, sha256, mime: detectedMime, magic: detectedMime.split("/")[1] };
}
