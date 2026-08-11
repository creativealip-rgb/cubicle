import { and, eq, sql } from "drizzle-orm";
import { db, type Db } from "@/db";
import { files, workspaceStorageUsage } from "@/db/schema";

/**
 * Safe reconciliation of `workspace_storage_usage` reservation state.
 *
 * Contract: reservations are transient by design. `reserved_bytes` /
 * `reserved_files` are only ever nonzero while an upload transaction is in
 * flight (reserve -> R2 -> insert -> consume). At rest they must be zero —
 * committed `files` rows are the single source of truth for a workspace's
 * real usage.
 *
 * Known leak paths this reconciles (without touching the `files` table):
 * - Client-portal upload routes reserve in their OWN transaction before the
 *   R2 write and consume after the insert; a hard crash between the two
 *   leaves the reservation permanently nonzero.
 * - `deleteFile` removes the `files` row but never touches the reservation
 *   counters.
 *
 * Safety properties:
 * - Defaults to DRY RUN — never mutates unless `dryRun: false` is explicit.
 * - Apply mode only zeroes reservation counters; it NEVER deletes or updates
 *   `files` rows.
 * - Deterministic: rows are scanned in workspace-id order and the report is
 *   fully derived from committed state, so a dry run and an apply run over
 *   the same snapshot agree.
 *
 * Age gate: a reservation is only considered stale once it is at least 5
 * minutes old (`updated_at < now() - interval '5 minutes'`). `updated_at` is
 * bumped on every reserve/consume, so an in-flight upload (or one that just
 * committed) is never zeroed. The apply-time UPDATE repeats the same age
 * predicate atomically, so a reservation that is touched between the scan and
 * the UPDATE is skipped rather than clobbered.
 *
 * Race note: zeroing a reservation while a concurrent upload holds it (the
 * portal out-of-tx window is milliseconds) weakens quota enforcement for
 * that one upload — it cannot corrupt data, go negative (the counters use
 * `greatest(0, ...)`), or delete anything. Schedule the cron off-peak and/or
 * target a specific workspace with `workspaceId` when uploads are known to
 * be quiet.
 */

export interface StorageUsageScanRow {
  workspaceId: string;
  /** Reservation counters as persisted (bigint mode "number"). */
  reservedBytes: number;
  reservedFiles: number;
  /** Last time a reserve/consume touched this row (drives the age gate). */
  updatedAt: Date | null;
  /** Real committed usage derived from the `files` table. */
  actualBytes: number;
  actualFiles: number;
}

export type StorageUsageReconcileStatus = "clean" | "active" | "stale";

export interface StorageUsageReconcileRow extends StorageUsageScanRow {
  status: StorageUsageReconcileStatus;
}

export interface StorageUsageReconcileReport {
  dryRun: boolean;
  scanned: number;
  /** Workspaces with a nonzero reservation younger than the age gate (in-flight uploads). */
  active: number;
  /** Workspaces with a nonzero reservation older than the age gate (leaked). */
  stale: number;
  applied: number;
  rows: StorageUsageReconcileRow[];
}

export interface ReconcileStorageUsageOptions {
  /** Restrict the scan/apply to a single workspace. */
  workspaceId?: string;
  /**
   * Defaults to true. When true the report is computed but no row is ever
   * updated. Pass `dryRun: false` explicitly to zero stale reservations.
   */
  dryRun?: boolean;
}

/**
 * A reservation is only reclaimed once it has been untouched for at least this
 * long. `updated_at` is bumped on every reserve/consume, so an upload that is
 * still in flight (or just committed) is younger than the gate and counts as
 * "active", never "stale".
 */
export const RESERVATION_STALE_AFTER_MS = 5 * 60 * 1000;

/**
 * True when a nonzero reservation is old enough to reclaim (i.e. has not been
 * touched for at least 5 minutes). A missing/unknown `updatedAt` is treated as
 * maximally old so leaked rows are never skipped.
 */
export function isStaleReservation(
  row: Pick<StorageUsageScanRow, "reservedBytes" | "reservedFiles" | "updatedAt">,
  now: Date = new Date(),
): boolean {
  if (Number(row.reservedBytes) === 0 && Number(row.reservedFiles) === 0) return false;
  const updatedAt = row.updatedAt ? new Date(row.updatedAt).getTime() : 0;
  return now.getTime() - updatedAt >= RESERVATION_STALE_AFTER_MS;
}

/** Zero counters → "clean"; nonzero and older than the gate → "stale"; otherwise "active". */
export function classifyReservation(
  row: Pick<StorageUsageScanRow, "reservedBytes" | "reservedFiles" | "updatedAt">,
  now: Date = new Date(),
): StorageUsageReconcileStatus {
  if (Number(row.reservedBytes) === 0 && Number(row.reservedFiles) === 0) return "clean";
  return isStaleReservation(row, now) ? "stale" : "active";
}

/** Deterministic summary of a scan — used to build the report. */
export function summarizeStorageUsageScan(
  rows: StorageUsageScanRow[],
  now: Date = new Date(),
): {
  scanned: number;
  active: number;
  stale: number;
  activeWorkspaces: string[];
  staleWorkspaces: string[];
} {
  const activeWorkspaces: string[] = [];
  const staleWorkspaces: string[] = [];
  for (const row of rows) {
    if (Number(row.reservedBytes) === 0 && Number(row.reservedFiles) === 0) continue;
    (isStaleReservation(row, now) ? staleWorkspaces : activeWorkspaces).push(row.workspaceId);
  }
  return {
    scanned: rows.length,
    active: activeWorkspaces.length,
    stale: staleWorkspaces.length,
    activeWorkspaces,
    staleWorkspaces,
  };
}

/**
 * Scan `workspace_storage_usage` joined against committed `files` rows.
 * Accepts an executor so callers inside a `db.transaction` can pass `tx`
 * (same convention as `getWorkspaceStorageQuota`).
 */
export async function scanWorkspaceStorageUsage(
  executor: Pick<Db, "select">,
  workspaceId?: string,
): Promise<StorageUsageScanRow[]> {
  const rows = await executor
    .select({
      workspaceId: workspaceStorageUsage.workspaceId,
      reservedBytes: workspaceStorageUsage.reservedBytes,
      reservedFiles: workspaceStorageUsage.reservedFiles,
      updatedAt: workspaceStorageUsage.updatedAt,
      actualBytes: sql<number>`coalesce(sum(${files.sizeBytes}), 0)`,
      actualFiles: sql<number>`count(${files.id})::int`,
    })
    .from(workspaceStorageUsage)
    .leftJoin(files, eq(files.workspaceId, workspaceStorageUsage.workspaceId))
    .where(workspaceId ? eq(workspaceStorageUsage.workspaceId, workspaceId) : undefined)
    .groupBy(
      workspaceStorageUsage.workspaceId,
      workspaceStorageUsage.reservedBytes,
      workspaceStorageUsage.reservedFiles,
      workspaceStorageUsage.updatedAt,
    )
    .orderBy(workspaceStorageUsage.workspaceId);

  return rows.map((row) => ({
    workspaceId: row.workspaceId,
    reservedBytes: Number(row.reservedBytes ?? 0),
    reservedFiles: Number(row.reservedFiles ?? 0),
    updatedAt: row.updatedAt ? new Date(row.updatedAt) : null,
    actualBytes: Number(row.actualBytes ?? 0),
    actualFiles: Number(row.actualFiles ?? 0),
  }));
}

/**
 * Reconcile reservation state against committed files.
 *
 * - `dryRun: true` (default): returns the report without mutating anything.
 * - `dryRun: false`: zeroes `reserved_bytes`/`reserved_files` on every STALE
 *   workspace inside one transaction. "Stale" means the reservation is
 *   nonzero AND `updated_at` is older than the 5-minute age gate — an
 *   in-flight upload is younger than the gate and is left untouched.
 *
 * Atomicity: the apply-time UPDATE repeats the age predicate (`updated_at <
 * now() - interval '5 minutes'`) inside the WHERE clause, so a reservation
 * that is touched between the scan and the UPDATE is skipped instead of
 * clobbered. Never touches the `files` table.
 */
export async function reconcileWorkspaceStorageUsage(
  options: ReconcileStorageUsageOptions = {},
  executor: Pick<Db, "select" | "transaction"> = db,
): Promise<StorageUsageReconcileReport> {
  const { workspaceId, dryRun = true } = options;
  const now = new Date();

  const rows = await scanWorkspaceStorageUsage(executor, workspaceId);
  const { active, stale } = summarizeStorageUsageScan(rows, now);

  let applied = 0;
  if (!dryRun && stale > 0) {
    await executor.transaction(async (tx) => {
      for (const row of rows) {
        if (!isStaleReservation(row, now)) continue;
        const [updated] = await tx
          .update(workspaceStorageUsage)
          .set({ reservedBytes: 0, reservedFiles: 0, updatedAt: new Date() })
          .where(
            and(
              eq(workspaceStorageUsage.workspaceId, row.workspaceId),
              sql`(${workspaceStorageUsage.reservedBytes} <> 0 OR ${workspaceStorageUsage.reservedFiles} <> 0)`,
              // Age gate repeated atomically: only reclaim reservations that
              // have been untouched for 5+ minutes. A concurrent reserve/consume
              // bumps updated_at, which fails this predicate and protects the
              // in-flight upload from being zeroed mid-flight.
              sql`${workspaceStorageUsage.updatedAt} < now() - interval '5 minutes'`,
            ),
          )
          .returning({ workspaceId: workspaceStorageUsage.workspaceId });
        if (updated) applied += 1;
      }
    });
  }

  return {
    dryRun,
    scanned: rows.length,
    active,
    stale,
    applied,
    rows: rows.map((row) => ({
      ...row,
      status: classifyReservation(row, now),
    })),
  };
}