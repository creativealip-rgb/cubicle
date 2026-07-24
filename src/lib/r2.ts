import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requiredEnv } from "@/lib/env";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  },
  // AWS SDK v3 (>=3.729) defaults to adding CRC32 checksum headers, which
  // Cloudflare R2 rejects on presigned PUTs — the browser then surfaces the
  // rejection as an opaque "Network error" (the error response carries no CORS
  // header). Force checksums off unless explicitly required to keep R2 happy.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = requiredEnv("R2_BUCKET_NAME");

export function buildFileKey(workspaceId: string, fileId: string, safeFilename: string) {
  return `workspaces/${workspaceId}/files/${fileId}/${safeFilename}`;
}

export async function getSignedDownloadUrl(storageKey: string, expiresIn = 300) {
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }), { expiresIn });
}

export async function getSignedUploadUrl(storageKey: string, contentType: string, expiresIn = 300) {
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: storageKey, ContentType: contentType }),
    { expiresIn },
  );
}

export async function deleteStoredFile(storageKey: string) {
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }));
}
