import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, uploadIntents, uploadQuotaReservations } from "@/db/schema";
import { R2_BUCKET, r2 } from "@/lib/r2";

export async function cleanupUploadIntent(intentId: string, now = new Date()) {
  const [intent] = await db.select().from(uploadIntents).where(eq(uploadIntents.id, intentId)).limit(1);
  if (!intent || intent.state !== "failed_cleanup" || !intent.cleanupRetryAt || intent.cleanupRetryAt > now || intent.retryCount >= 10) return false;
  if (!intent.quarantineKey.startsWith(`quarantine/${intent.workspaceId}/`)) throw new Error("INVALID_QUARANTINE_KEY");
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: intent.quarantineKey }));
    await db.transaction(async (tx) => {
      if (intent.finalFileId) await tx.delete(files).where(and(eq(files.id, intent.finalFileId), eq(files.workspaceId, intent.workspaceId), eq(files.uploadState, "pending")));
      await tx.update(uploadQuotaReservations).set({ state: "released", releasedAt: now, updatedAt: now }).where(and(eq(uploadQuotaReservations.intentId, intent.id), eq(uploadQuotaReservations.state, "active")));
      await tx.update(uploadIntents).set({ state: "aborted", cleanupRetryAt: null, version: sql`${uploadIntents.version} + 1`, updatedAt: now }).where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.workspaceId, intent.workspaceId), eq(uploadIntents.state, "failed_cleanup"), eq(uploadIntents.version, intent.version)));
    });
    return true;
  } catch {
    const minutes = Math.min(1440, 2 ** Math.min(intent.retryCount + 1, 10));
    await db.update(uploadIntents).set({ retryCount: sql`${uploadIntents.retryCount} + 1`, cleanupRetryAt: new Date(now.getTime() + minutes * 60_000), updatedAt: now }).where(and(eq(uploadIntents.id, intent.id), eq(uploadIntents.state, "failed_cleanup"), eq(uploadIntents.version, intent.version), lte(uploadIntents.cleanupRetryAt, now)));
    return false;
  }
}
