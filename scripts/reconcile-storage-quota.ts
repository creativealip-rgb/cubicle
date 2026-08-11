/**
 * Reconcile `workspace_storage_usage` reservation state against committed
 * `files` rows.
 *
 * SAFE BY DEFAULT:
 * - Without `--apply` this runs in DRY-RUN mode: it scans every workspace and
 *   prints what WOULD be reset, but never writes a single row.
 * - With `--apply` it zeroes `reserved_bytes`/`reserved_files` on stale
 *   workspaces. It NEVER deletes or updates `files` rows.
 * - Against production, `--apply` additionally requires
 *   `ALLOW_PRODUCTION_RECONCILE=1` (same pattern as `scripts/migrate-ledger.sh`).
 *
 * Usage:
 *   npm run reconcile:storage-quota                 # dry run, all workspaces
 *   npm run reconcile:storage-quota -- --workspace <uuid>   # dry run, one workspace
 *   npm run reconcile:storage-quota -- --apply      # apply, all workspaces
 *   npm run reconcile:storage-quota -- --apply --workspace <uuid>
 *
 * Env: `DATABASE_URL` is required (falls back to localhost defaults like
 * `src/db/index.ts`). `ALLOW_PRODUCTION_RECONCILE=1` is required when
 * `NODE_ENV=production` and `--apply` is passed.
 */
import { db } from "@/db";
import {
  reconcileWorkspaceStorageUsage,
  isStaleReservation,
} from "@/lib/storage-quota-reconcile";

function parseArgs(argv: string[]) {
  const apply = argv.includes("--apply");
  const workspaceIndex = argv.indexOf("--workspace");
  const workspaceId =
    workspaceIndex >= 0 && argv[workspaceIndex + 1] ? argv[workspaceIndex + 1] : undefined;
  return { apply, workspaceId };
}

async function main() {
  const { apply, workspaceId } = parseArgs(process.argv.slice(2));

  if (apply && process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_RECONCILE !== "1") {
    throw new Error(
      "Refusing to apply reconciliation against production: set ALLOW_PRODUCTION_RECONCILE=1 to confirm.",
    );
  }

  const report = await reconcileWorkspaceStorageUsage(
    { workspaceId, dryRun: !apply },
    db,
  );

  console.log(`storage-quota reconcile: ${apply ? "APPLY" : "DRY RUN (no changes)"}`);
  console.log(`  scanned:  ${report.scanned} workspace(s)`);
  console.log(`  active:   ${report.active} workspace(s) with in-flight reservations (< 5 min old, untouched)`);
  console.log(`  stale:    ${report.stale} workspace(s) with leaked reservations (>= 5 min old)`);
  console.log(`  applied:  ${report.applied} workspace(s) reset`);

  for (const row of report.rows) {
    if (!isStaleReservation(row)) continue;
    console.log(
      `  - ${row.workspaceId}: reserved_bytes=${row.reservedBytes} reserved_files=${row.reservedFiles} ` +
        `(actual: ${row.actualBytes} bytes / ${row.actualFiles} files) → would reset to 0`,
    );
  }

  if (report.stale === 0) console.log("  (nothing to reconcile — all reservations clean)");
  if (!apply) {
    console.log("\nDry run only — re-run with --apply to zero the leaked reservations.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("reconcile-storage-quota failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
