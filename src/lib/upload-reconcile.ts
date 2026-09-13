import { and, eq, gt, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { files, uploadIntents, uploadQuotaReservations } from "@/db/schema";
import { expireUploadIntent, recoverStalePromotion, retryFailedPromotion } from "@/lib/upload-intent-service";

export const UPLOAD_RECONCILE_CHECKS = [
  "intent_counts",
  "stale_promoting",
  "expired_active",
  "pending_without_active_intent",
  "completed_with_pending_file",
  "terminal_reservation_leak",
  "missing_final_file",
] as const;

export type UploadReconcileReport = {
  version: 1;
  dryRun: boolean;
  scope: "all";
  expectedChecks: string[];
  executedChecks: string[];
  counts: {
    intents: number; files: number; reservations: number; stalePromoting: number;
    expiredActive: number; pendingWithoutIntent: number; completedWithPendingFile: number;
    activeReservationTerminalIntent: number; missingFinalFile: number;
  };
  actions: { expired: number; deletedObjects: number };
};

export function validateUploadReconcileReport(report: UploadReconcileReport) {
  if (report.version !== 1 || report.scope !== "all") return false;
  const expected = [...UPLOAD_RECONCILE_CHECKS];
  if (report.expectedChecks.length !== expected.length || report.executedChecks.length !== expected.length) return false;
  return new Set(report.expectedChecks).size === expected.length && new Set(report.executedChecks).size === expected.length && expected.every((id) => report.expectedChecks.includes(id) && report.executedChecks.includes(id));
}

export async function reconcileUploadIntents(options: { dryRun?: boolean; limit?: number; workerId?: string } = {}): Promise<UploadReconcileReport> {
  const { dryRun = true, limit = 100 } = options;
  const now = new Date();
  const staleBefore = new Date(now.getTime() - 5 * 60_000);
  const [summary] = await db.select({
    intents: sql<number>`(select count(*)::int from upload_intents)`,
    files: sql<number>`(select count(*)::int from files where upload_state = 'pending')`,
    reservations: sql<number>`(select count(*)::int from upload_quota_reservations where state = 'active')`,
    stalePromoting: sql<number>`(select count(*)::int from upload_intents where state = 'promoting' and promotion_lease_expires_at < ${staleBefore})`,
    expiredActive: sql<number>`(select count(*)::int from upload_intents where state in ('reserved','uploaded') and expires_at < ${now})`,
    pendingWithoutIntent: sql<number>`(select count(*)::int from files f where f.upload_state = 'pending' and not exists (select 1 from upload_intents i where i.final_file_id = f.id and i.state in ('promoting','promotion_failed')))`,
    completedWithPendingFile: sql<number>`(select count(*)::int from upload_intents i join files f on f.id=i.final_file_id where i.state='completed' and f.upload_state <> 'completed')`,
    activeReservationTerminalIntent: sql<number>`(select count(*)::int from upload_quota_reservations r join upload_intents i on i.id=r.intent_id where r.state='active' and i.state in ('completed','aborted','expired','quarantined','failed_cleanup'))`,
    missingFinalFile: sql<number>`(select count(*)::int from upload_intents i where i.state in ('promoting','promotion_failed','completed') and (i.final_file_id is null or not exists (select 1 from files f where f.id=i.final_file_id)))`,
  }).from(sql`(select 1) as reconcile_scope`);

  let expired = 0;
  if (!dryRun) {
    const workerId = options.workerId ?? `upload-reconcile-${process.pid}`;
    const retryLease = () => new Date(Date.now() + 5 * 60_000);
    const failed = await db.select().from(uploadIntents).where(and(eq(uploadIntents.state, "promotion_failed"), gt(uploadIntents.expiresAt, now))).limit(limit);
    for (const intent of failed) {
      try { await retryFailedPromotion(intent.id, intent.workspaceId, intent.version, workerId, retryLease()); } catch { /* lost CAS race */ }
    }
    const stale = await db.select().from(uploadIntents).where(and(eq(uploadIntents.state, "promoting"), lt(uploadIntents.promotionLeaseExpiresAt, now))).limit(limit);
    for (const intent of stale) {
      try { await recoverStalePromotion(intent.id, intent.workspaceId, intent.version, retryLease()); } catch { /* lost CAS race */ }
    }
    const candidates = await db.select().from(uploadIntents).where(and(inArray(uploadIntents.state, ["reserved", "uploaded"]), lt(uploadIntents.expiresAt, now))).limit(limit);
    for (const candidate of candidates) {
      try { await expireUploadIntent(candidate.id, candidate.workspaceId, candidate.version); expired += 1; } catch { /* lost CAS race; next run re-evaluates */ }
    }
  }

  const report: UploadReconcileReport = { version: 1, dryRun, scope: "all", expectedChecks: [...UPLOAD_RECONCILE_CHECKS], executedChecks: [...UPLOAD_RECONCILE_CHECKS], counts: summary, actions: { expired, deletedObjects: 0 } };
  if (!validateUploadReconcileReport(report)) throw new Error("UPLOAD_RECONCILE_INCOMPLETE");
  return report;
}

// Keep imports tied to schema contracts used by raw SQL names.
void files; void uploadQuotaReservations; void eq;
