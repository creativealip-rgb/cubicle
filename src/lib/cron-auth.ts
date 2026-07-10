import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

/**
 * Constant-time string comparison to avoid leaking the secret via timing.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate a cron request's Authorization header against CRON_SECRET.
 *
 * Behavior:
 *  - production + no secret configured → 503 (misconfiguration)
 *  - non-production + no secret        → allowed (local dev convenience)
 *  - secret configured                 → constant-time Bearer token check
 *
 * Returns `null` when the request is authorized, or a ready-to-return
 * error `NextResponse` otherwise.
 */
export function verifyCronRequest(request: Request): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Cron secret is not configured" }, { status: 503 });
    }
    return null;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
