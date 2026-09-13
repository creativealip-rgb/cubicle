import { randomUUID } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, uploadIntents, uploadQuotaReservations } from "@/db/schema";
import { consumeWorkspaceUploadTx, reserveWorkspaceUploadTx } from "@/lib/storage-quota";

export type CreateUploadIntentInput = {
  workspaceId: string;
  actorType: "user" | "portal" | "public";
  actorId: string;
  destinationType: string;
  destinationId: string;
  idempotencyKey: string;
  expectedMime: string;
  expectedBytes: number;
  maxBytes: number;
  expectedSha256?: string;
  expiresAt: Date;
};

export async function createUploadIntent(input: CreateUploadIntentInput) {
  if (!Number.isSafeInteger(input.expectedBytes) || !Number.isSafeInteger(input.maxBytes) || input.expectedBytes < 0 || input.expectedBytes > input.maxBytes) throw new Error("INVALID_UPLOAD_SIZE");
  if (input.expectedSha256 && !/^[0-9a-f]{64}$/i.test(input.expectedSha256)) throw new Error("INVALID_UPLOAD_CHECKSUM");
  if (input.expiresAt <= new Date()) throw new Error("INVALID_UPLOAD_EXPIRY");
  return db.transaction(async (tx) => {
    const id = randomUUID();
    const [created] = await tx.insert(uploadIntents).values({
      id,
      ...input,
      expectedSha256: input.expectedSha256?.toLowerCase(),
      quarantineKey: `quarantine/${input.workspaceId}/${id}`,
      finalKey: `workspaces/${input.workspaceId}/files/${id}`,
    }).onConflictDoNothing().returning();

    if (!created) {
      const [existing] = await tx.select().from(uploadIntents).where(and(
        eq(uploadIntents.workspaceId, input.workspaceId),
        eq(uploadIntents.actorType, input.actorType),
        eq(uploadIntents.actorId, input.actorId),
        eq(uploadIntents.destinationType, input.destinationType),
        eq(uploadIntents.destinationId, input.destinationId),
        eq(uploadIntents.idempotencyKey, input.idempotencyKey),
      )).limit(1);
      if (!existing || existing.expectedBytes !== input.expectedBytes || existing.expectedMime !== input.expectedMime || existing.expectedSha256 !== (input.expectedSha256?.toLowerCase() ?? null)) throw new Error("IDEMPOTENCY_CONFLICT");
      return existing;
    }

    await reserveWorkspaceUploadTx(tx, input.workspaceId, input.expectedBytes);
    await tx.insert(uploadQuotaReservations).values({ intentId: created.id, workspaceId: input.workspaceId, bytes: input.expectedBytes, expiresAt: input.expiresAt });
    return created;
  });
}

export async function confirmUpload(intentId: string, workspaceId: string, version: number, provider: { etag: string; versionId?: string }) {
  const [updated] = await db.update(uploadIntents).set({ state: "uploaded", providerEtag: provider.etag, providerVersionId: provider.versionId, uploadedAt: new Date(), version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.state, "reserved"), eq(uploadIntents.version, version), gt(uploadIntents.expiresAt, new Date()))).returning();
  if (!updated) throw new Error("UPLOAD_INTENT_CONFLICT");
  return updated;
}

export async function claimValidation(intentId: string, workspaceId: string, version: number) {
  const [updated] = await db.update(uploadIntents).set({ state: "validating", version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.state, "uploaded"), eq(uploadIntents.version, version), gt(uploadIntents.expiresAt, new Date()))).returning();
  if (!updated) throw new Error("UPLOAD_INTENT_CONFLICT");
  return updated;
}

export async function claimPromotion(intentId: string, workspaceId: string, version: number, leaseOwner: string, leaseExpiresAt: Date) {
  const promotionAttemptId = randomUUID();
  const [updated] = await db.update(uploadIntents).set({ state: "promoting", promotionAttemptId, promotionLeaseOwner: leaseOwner, promotionLeaseExpiresAt: leaseExpiresAt, retryCount: sql`${uploadIntents.retryCount} + 1`, version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.state, "validating"), eq(uploadIntents.version, version), gt(uploadIntents.expiresAt, new Date()), sql`${uploadIntents.retryCount} < 10`)).returning();
  if (!updated) throw new Error("UPLOAD_INTENT_CONFLICT");
  return updated;
}

export async function claimUploadPromotion(input: { intentId: string; workspaceId: string; version: number; leaseOwner: string; leaseExpiresAt: Date; name: string; visibility: "internal" | "client"; fileType: "working_file" | "deliverable"; uploadedBy?: string }) {
  return db.transaction(async (tx) => {
    const [intent] = await tx.select().from(uploadIntents).where(and(eq(uploadIntents.id, input.intentId), eq(uploadIntents.workspaceId, input.workspaceId))).for("update");
    if (!intent || intent.state !== "validating" || intent.version !== input.version || intent.expiresAt <= new Date() || intent.retryCount >= 10) throw new Error("UPLOAD_INTENT_CONFLICT");
    const promotionAttemptId = randomUUID();
    const [pendingFile] = await tx.insert(files).values({ workspaceId: input.workspaceId, name: input.name, storageKey: intent.finalKey, mimeType: intent.expectedMime, sizeBytes: intent.expectedBytes, visibility: input.visibility, fileType: input.fileType, uploadedBy: input.uploadedBy, uploadState: "pending" }).returning();
    const [claimed] = await tx.update(uploadIntents).set({ state: "promoting", finalFileId: pendingFile.id, promotionAttemptId, promotionLeaseOwner: input.leaseOwner, promotionLeaseExpiresAt: input.leaseExpiresAt, retryCount: sql`${uploadIntents.retryCount} + 1`, version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, input.intentId), eq(uploadIntents.workspaceId, input.workspaceId), eq(uploadIntents.state, "validating"), eq(uploadIntents.version, input.version))).returning();
    if (!claimed) throw new Error("UPLOAD_INTENT_CONFLICT");
    return { intent: claimed, file: pendingFile };
  });
}

export async function markPromotionFailed(intentId: string, workspaceId: string, version: number, promotionAttemptId: string, leaseOwner: string, errorCode: string) {
  const [failed] = await db.update(uploadIntents).set({ state: "promotion_failed", lastErrorCode: errorCode.slice(0, 100), promotionLeaseOwner: null, promotionLeaseExpiresAt: null, version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.state, "promoting"), eq(uploadIntents.version, version), eq(uploadIntents.promotionAttemptId, promotionAttemptId), eq(uploadIntents.promotionLeaseOwner, leaseOwner), gt(uploadIntents.promotionLeaseExpiresAt, new Date()))).returning();
  return failed ?? null;
}

export async function completePromotion(intentId: string, workspaceId: string, version: number, promotionAttemptId: string) {
  return db.transaction(async (tx) => {
    const [intent] = await tx.select().from(uploadIntents).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId))).for("update");
    if (!intent || intent.state !== "promoting" || intent.version !== version || intent.promotionAttemptId !== promotionAttemptId || !intent.finalFileId || !intent.promotionLeaseExpiresAt || intent.promotionLeaseExpiresAt <= new Date()) throw new Error("STALE_PROMOTION_ATTEMPT");
    const [reservation] = await tx.select().from(uploadQuotaReservations).where(eq(uploadQuotaReservations.intentId, intentId)).for("update");
    if (!reservation || reservation.state !== "active") throw new Error("RESERVATION_CONFLICT");
    await consumeWorkspaceUploadTx(tx, workspaceId, reservation.bytes);
    const [consumed] = await tx.update(uploadQuotaReservations).set({ state: "consumed", consumedAt: new Date(), version: sql`${uploadQuotaReservations.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadQuotaReservations.id, reservation.id), eq(uploadQuotaReservations.workspaceId, workspaceId), eq(uploadQuotaReservations.state, "active"), eq(uploadQuotaReservations.version, reservation.version))).returning();
    if (!consumed) throw new Error("RESERVATION_CONFLICT");
    const [completedFile] = await tx.update(files).set({ uploadState: "completed" }).where(and(eq(files.id, intent.finalFileId), eq(files.workspaceId, workspaceId), eq(files.uploadState, "pending"))).returning();
    if (!completedFile) throw new Error("PENDING_FILE_CONFLICT");
    const [completed] = await tx.update(uploadIntents).set({ state: "completed", completedAt: new Date(), version: sql`${uploadIntents.version} + 1`, promotionLeaseOwner: null, promotionLeaseExpiresAt: null, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.state, "promoting"), eq(uploadIntents.version, version), eq(uploadIntents.promotionAttemptId, promotionAttemptId))).returning();
    if (!completed) throw new Error("STALE_PROMOTION_ATTEMPT");
    return completed;
  });
}

export async function expireUploadIntent(intentId: string, workspaceId: string, version: number) {
  return db.transaction(async (tx) => {
    const [intent] = await tx.select().from(uploadIntents).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId))).for("update");
    if (!intent || intent.version !== version || !["reserved", "uploaded"].includes(intent.state) || intent.expiresAt > new Date() || (intent.promotionLeaseExpiresAt && intent.promotionLeaseExpiresAt > new Date())) throw new Error("UPLOAD_INTENT_CONFLICT");
    const [reservation] = await tx.select().from(uploadQuotaReservations).where(eq(uploadQuotaReservations.intentId, intentId)).for("update");
    if (!reservation || reservation.state !== "active") throw new Error("RESERVATION_CONFLICT");
    await consumeWorkspaceUploadTx(tx, workspaceId, reservation.bytes);
    await tx.update(uploadQuotaReservations).set({ state: "released", releasedAt: new Date(), version: sql`${uploadQuotaReservations.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadQuotaReservations.id, reservation.id), eq(uploadQuotaReservations.state, "active"), eq(uploadQuotaReservations.version, reservation.version)));
    const [expired] = await tx.update(uploadIntents).set({ state: "expired", version: sql`${uploadIntents.version} + 1`, updatedAt: new Date() }).where(and(eq(uploadIntents.id, intentId), eq(uploadIntents.workspaceId, workspaceId), eq(uploadIntents.version, version))).returning();
    if (!expired) throw new Error("UPLOAD_INTENT_CONFLICT");
    return expired;
  });
}
