import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { R2_BUCKET, r2, deleteStoredFile } from "@/lib/r2";
import { claimValidation, confirmUpload, createUploadIntent } from "@/lib/upload-intent-service";
import { runUploadPromotionSaga } from "@/lib/upload-saga-coordinator";

export async function promoteBufferedUpload(input: {
  workspaceId: string; actorType: "user" | "portal" | "public"; actorId: string;
  body: Buffer; mime: string; name: string; visibility: "internal" | "client";
  fileType: "working_file" | "deliverable"; uploadedBy: string | null;
  clientId?: string | null; projectId?: string | null; folderId?: string | null;
  destinationId: string; idempotencyKey?: string;
}) {
  if (!new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]).has(input.mime)) throw new Error("UNSUPPORTED_UPLOAD_MIME");
  const intent = await createUploadIntent({
    workspaceId: input.workspaceId, actorType: input.actorType, actorId: input.actorId,
    destinationType: "file", destinationId: input.destinationId, idempotencyKey: input.idempotencyKey ?? randomUUID(),
    expectedBytes: input.body.length, maxBytes: input.body.length, expectedMime: input.mime,
    expectedSha256: createHash("sha256").update(input.body).digest("hex"), fileName: input.name,
    visibility: input.visibility, fileType: input.fileType, clientId: input.clientId ?? undefined,
    projectId: input.projectId ?? undefined, folderId: input.folderId ?? undefined, uploadedBy: input.uploadedBy ?? undefined,
    expiresAt: new Date(Date.now() + 15 * 60_000),
  });
  let promotionStarted = false;
  try {
    const put = await r2.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: intent.quarantineKey, Body: input.body, ContentType: input.mime, ContentLength: input.body.length, IfNoneMatch: "*" }));
    const uploaded = await confirmUpload(intent.id, input.workspaceId, intent.version, { etag: put.ETag ?? "", versionId: put.VersionId });
    const workerId = `buffered-upload-${randomUUID()}`;
    const validating = await claimValidation(uploaded.id, input.workspaceId, uploaded.version, workerId, new Date(Date.now() + 60_000));
    promotionStarted = true;
    return await runUploadPromotionSaga({ intentId: validating.id, workspaceId: input.workspaceId, version: validating.version, workerId, name: input.name, visibility: input.visibility, fileType: input.fileType });
  } catch (error) {
    if (!promotionStarted) await deleteStoredFile(intent.quarantineKey).catch(() => undefined);
    throw error;
  }
}
