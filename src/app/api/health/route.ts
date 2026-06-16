import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Health check endpoint for Docker / uptime monitoring.
 *
 * Returns 200 when the app + DB are reachable.
 * Returns 503 when the DB is unreachable (Docker will restart the container).
 *
 * Intentionally does NOT check R2 or external services — those are non-critical
 * for the app to serve. We want Docker to restart only for real outages.
 */
export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "ok", ts: Date.now() });
  } catch (err) {
    return NextResponse.json(
      { status: "degraded", db: "down", error: String(err), ts: Date.now() },
      { status: 503 }
    );
  }
}
