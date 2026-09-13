import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, uploadIntents, uploadQuotaReservations } from "@/db/schema";
import { R2_BUCKET, r2 } from "@/lib/r2";

export async function cleanupUploadIntent(intentId: string, now = new Date()) {
  const [intent] = await db.select().from(uploadIntents).where(eq(uploadIntents.id, intentId)).limit(1);
  if (!intent || intent.state !== "failed_cleanup" || !intent.cleanupRetryAt || intent.cleanupRetryAt > now || intent.retryCount >= 10) return false;
  if (!intent.quarantineKey.startsWith(`quarantine/${intent.workspaceId}/`)) throw new Error("INVALID_QUARANTINE_KEY");
  const [claimed] = await db.update(uploadIntents).set({ cleanupRetryAt: new Date(now.getTime() + 15 * 60_000), version: sql`${uploadIntents.version} + 1`, updatedAt: now }).where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.state, "failed_cleanup"), eq(uploadIntents.version, intent.version), lte(uploadIntents.cleanupRetryAt, now))).returning();
  if (!claimed) return false;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: intent.quarantineKey }));
    await db.transaction(async (tx) => {
      if (claimed.finalFileId) await tx.delete(files).where(and(eq(files.id, claimed.finalFileId), eq(files.workspaceId, claimed.workspaceId), eq(files.uploadState, "pending")));
      await tx.update(uploadQuotaReservations).set({ state: "released", releasedAt: now, updatedAt: now }).where(and(eq(uploadQuotaReservations.intentId, claimed.id), eq(uploadQuotaReservations.state, "active")));
      const [finished] = await tx.update(uploadIntents).set({ state: "aborted", cleanupRetryAt: null, version: sql`${uploadIntents.version} + 1`, updatedAt: now }).where(and(eq(uploadIntents.id, claimed.id), eq(uploadIntents.workspaceId, claimed.workspaceId), eq(uploadIntents.state, "failed_cleanup"), eq(uploadIntents.version, claimed.version))).returning();
      if (!finished) throw new Error("UPLOAD_CLEANUP_FENCE_LOST");
    });
    return true;
  } catch {
    const minutes = Math.min(1440, 2 ** Math.min(claimed.retryCount + 1, 10));
    await db.update(uploadIntents).set({ retryCount: sql`${uploadIntents.retryCount} + 1`, cleanupRetryAt: new Date(now.getTime() + minutes * 60_000), updatedAt: now }).where(and(eq(uploadIntents.id, claimed.id), eq(uploadIntents.state, "failed_cleanup"), eq(uploadIntents.version, claimed.version)));
    return false;
  }
}
