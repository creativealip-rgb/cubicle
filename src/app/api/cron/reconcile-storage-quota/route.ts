import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { reconcileWorkspaceStorageUsage } from "@/lib/storage-quota-reconcile";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Scheduled reconciliation of `workspace_storage_usage` reservation state.
 *
 * Protected by the shared `CRON_SECRET` bearer check (`verifyCronRequest`).
 * APPLIES by default (this is the explicit scheduled job): stale reservations
 * are zeroed. "Stale" means nonzero counters whose `updated_at` is at least 5
 * minutes old — an in-flight upload (younger than the gate) is left untouched,
 * and the apply-time UPDATE repeats the age predicate atomically so a
 * reservation touched mid-reconcile is never clobbered.
 * It never touches the `files` table.
 *
 * Pass `?dryRun=1` to only report what would be reset:
 *   GET /api/cron/reconcile-storage-quota?dryRun=1
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const dryRun = new URL(request.url).searchParams.get("dryRun") === "1";

  try {
    const report = await reconcileWorkspaceStorageUsage({ dryRun });
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[cron/reconcile-storage-quota] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
