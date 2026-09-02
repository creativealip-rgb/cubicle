import { createHash } from "node:crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";

function runtimeEnv(name: string): string | undefined {
  if (isProductionBuild) return `build-only-${name.toLowerCase()}`;
  return process.env[name]?.trim() || undefined;
}

function hasR2Config(): boolean {
  return Boolean(
    runtimeEnv("R2_ACCOUNT_ID") &&
      runtimeEnv("R2_ACCESS_KEY_ID") &&
      runtimeEnv("R2_SECRET_ACCESS_KEY") &&
      runtimeEnv("R2_BUCKET_NAME"),
  );
}

export const R2_CONFIGURED = hasR2Config();

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${runtimeEnv("R2_ACCOUNT_ID") ?? "dev-r2-disabled"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: runtimeEnv("R2_ACCESS_KEY_ID") ?? "dev-r2-disabled",
    secretAccessKey: runtimeEnv("R2_SECRET_ACCESS_KEY") ?? "dev-r2-disabled",
  },
  // AWS SDK v3 (>=3.729) defaults to adding CRC32 checksum headers, which
  // Cloudflare R2 rejects on presigned PUTs — the browser then surfaces the
  // rejection as an opaque "Network error" (the error response carries no CORS
  // header). Force checksums off unless explicitly required to keep R2 happy.
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
});

export const R2_BUCKET = runtimeEnv("R2_BUCKET_NAME") ?? "dev-r2-disabled";

function assertR2Configured() {
  if (!R2_CONFIGURED) {
    throw new Error("R2 storage is not configured in this environment");
  }
}

export function buildFileKey(workspaceId: string, fileId: string, safeFilename: string) {
  return `workspaces/${workspaceId}/files/${fileId}/${safeFilename}`;
}

export async function getSignedDownloadUrl(storageKey: string, expiresIn = 300) {
  assertR2Configured();
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }), { expiresIn });
}

export async function getSignedUploadUrl(storageKey: string, contentType: string, expiresIn = 300) {
  assertR2Configured();
  return getSignedUrl(
    r2,
    new PutObjectCommand({ Bucket: R2_BUCKET, Key: storageKey, ContentType: contentType }),
    { expiresIn },
  );
}

export async function deleteStoredFile(storageKey: string) {
  assertR2Configured();
  await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }));
}

export async function inspectStoredFile(storageKey: string) {
  assertR2Configured();
  const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: storageKey }));
  if (!object.Body) throw new Error("Stored file is empty");
  const bytes = await object.Body.transformToByteArray();
  return {
    bytes,
    size: bytes.byteLength,
    mime: object.ContentType ?? "",
    checksum: createHash("sha256").update(bytes).digest("hex"),
  };
}
