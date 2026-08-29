import { and, eq, sql } from "drizzle-orm";
import { db, type Db } from "@/db";
import { files, userStorageAddons, users, workspaceMembers, workspaces, workspaceStorageUsage } from "@/db/schema";
import { ForbiddenError } from "@/lib/access";
import { getUploadQuotaLimits, UploadQuotaError } from "@/lib/upload-safety";

const _GB = 1024 ** 3;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Anything that can run a query: the parent `db` client or a transaction from
 * `db.transaction(...)`. Defaults to the parent `db` when omitted, so external
 * callers keep the existing behavior.
 *
 * Pass the transaction (`tx`) when called inside `db.transaction` so the read
 * shares the transaction's connection and snapshot. Never use the module-level
 * `db` inside a transaction: it grabs a second pooled connection while the tx
 * holds the `FOR UPDATE` row lock (pool-exhaustion deadlock under concurrent
 * uploads) and reads quota state outside the transaction snapshot.
 */
export type StorageQuotaQueryExecutor = Pick<Db, "select" | "insert" | "update" | "delete">;

export async function getWorkspaceStorageQuota(workspaceId: string, executor: StorageQuotaQueryExecutor = db) {
  const [workspace] = await executor.select({ ownerId: workspaces.ownerId, plan: users.plan })
    .from(workspaces).innerJoin(users, eq(users.id, workspaces.ownerId))
    .where(eq(workspaces.id, workspaceId)).limit(1);
  if (!workspace) throw new ForbiddenError("Workspace not found");

  const [addons] = await executor.select({ bytes: sql<number>`coalesce(sum(${userStorageAddons.storageBytes}), 0)` })
    .from(userStorageAddons)
    .innerJoin(workspaceMembers, eq(workspaceMembers.userId, userStorageAddons.userId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), sql`${userStorageAddons.status} IN ('active', 'cancel_scheduled')`, sql`${userStorageAddons.endsAt} > now()`));

  const base = getUploadQuotaLimits(workspace.plan ?? "free").maxWorkspaceBytes;
  return { maxBytes: base + Number(addons?.bytes ?? 0), maxFiles: getUploadQuotaLimits(workspace.plan ?? "free").maxWorkspaceFiles };
}

/**
 * Core quota accounting. Must only be called inside a transaction that also
 * inserts the file row, so the reservation and the insert commit atomically
 * (see withWorkspaceQuotaReservation / completeUpload).
 */
export async function reserveWorkspaceUploadTx(tx: Tx, workspaceId: string, incomingBytes: number) {
  const quota = await getWorkspaceStorageQuota(workspaceId, tx);
  await tx.insert(workspaceStorageUsage).values({ workspaceId }).onConflictDoNothing();
  const [usage] = await tx.select().from(workspaceStorageUsage).where(eq(workspaceStorageUsage.workspaceId, workspaceId)).for("update");
  const [current] = await tx.select({ bytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`, count: sql<number>`count(*)::int` })
    .from(files).where(eq(files.workspaceId, workspaceId));
  if (Number(current?.bytes ?? 0) + Number(usage?.reservedBytes ?? 0) + incomingBytes > quota.maxBytes || Number(current?.count ?? 0) + Number(usage?.reservedFiles ?? 0) + 1 > quota.maxFiles) {
    throw new UploadQuotaError("WORKSPACE_BYTES_LIMIT");
  }
  await tx.update(workspaceStorageUsage).set({ reservedBytes: sql`${workspaceStorageUsage.reservedBytes} + ${incomingBytes}`, reservedFiles: sql`${workspaceStorageUsage.reservedFiles} + 1`, updatedAt: new Date() }).where(eq(workspaceStorageUsage.workspaceId, workspaceId));
}

/**
 * Move a reservation into the real usage count after the file row committed.
 * Must be called inside the same transaction so reservedBytes cannot leak.
 */
export async function consumeWorkspaceUploadTx(tx: Tx, workspaceId: string, bytes: number) {
  await tx.update(workspaceStorageUsage).set({ reservedBytes: sql`greatest(0, ${workspaceStorageUsage.reservedBytes} - ${bytes})`, reservedFiles: sql`greatest(0, ${workspaceStorageUsage.reservedFiles} - 1)`, updatedAt: new Date() }).where(eq(workspaceStorageUsage.workspaceId, workspaceId));
}

/**
 * Run `work` with a workspace upload reservation, consuming it on success and
 * releasing it on failure — all inside one transaction. Every upload path that
 * does not call completeUpload should route through this so the workspace
 * quota guard cannot be bypassed by calling db.insert(files) directly.
 */
export async function withWorkspaceQuotaReservation<T>(
  workspaceId: string,
  incomingBytes: number,
  work: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await reserveWorkspaceUploadTx(tx, workspaceId, incomingBytes);
    try {
      const result = await work(tx);
      await consumeWorkspaceUploadTx(tx, workspaceId, incomingBytes);
      return result;
    } catch (error) {
      // Rollback releases the reservation; nothing to do here.
      throw error;
    }
  });
}

export async function reserveWorkspaceUpload(workspaceId: string, incomingBytes: number) {
  return db.transaction(async (tx) => {
    await reserveWorkspaceUploadTx(tx, workspaceId, incomingBytes);
    return { bytes: incomingBytes };
  });
}

export async function releaseWorkspaceUpload(workspaceId: string, bytes: number) {
  await db.update(workspaceStorageUsage).set({ reservedBytes: sql`greatest(0, ${workspaceStorageUsage.reservedBytes} - ${bytes})`, reservedFiles: sql`greatest(0, ${workspaceStorageUsage.reservedFiles} - 1)`, updatedAt: new Date() }).where(eq(workspaceStorageUsage.workspaceId, workspaceId));
}

export const consumeWorkspaceUpload = releaseWorkspaceUpload;
