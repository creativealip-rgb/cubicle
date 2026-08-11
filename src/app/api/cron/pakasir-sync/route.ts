import { NextResponse } from "next/server";
import { verifyCronRequest } from "@/lib/cron-auth";
import { syncPendingPakasirPayments } from "@/lib/pakasir-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Missed-webhook recovery for Pakasir payments.
 *
 * The live webhook (`/api/webhooks/pakasir`) is the primary activation path;
 * this cron is the safety net for webhooks that never arrived (provider outage,
 * network drop, deploy window). It scans pending `pakasir_payments` (bounded,
 * oldest first), re-fetches the provider transaction detail (fail-closed —
 * never trusts local state alone), and completes payments the provider
 * confirms as `completed` via the SAME shared activation helper the webhook
 * uses, so both paths are idempotent and can never diverge.
 *
 * Protected by `verifyCronRequest` (timing-safe Bearer `CRON_SECRET`).
 *
 *   GET /api/cron/pakasir-sync
 *   Authorization: Bearer ***
 *
 * Optional `?limit=` bounds the batch (default 25).
 */
export async function GET(request: Request) {
  const unauthorized = verifyCronRequest(request);
  if (unauthorized) return unauthorized;

  const rawLimit = new URL(request.url).searchParams.get("limit");
  const limit = rawLimit ? Math.min(Math.max(Number.parseInt(rawLimit, 10) || 25, 1), 100) : 25;

  try {
    const report = await syncPendingPakasirPayments(limit);
    return NextResponse.json({ ok: true, ...report });
  } catch (err) {
    console.error("[cron/pakasir-sync] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
