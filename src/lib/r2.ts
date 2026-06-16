import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { requiredEnv } from "@/lib/env";

export const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${requiredEnv("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
  },
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
