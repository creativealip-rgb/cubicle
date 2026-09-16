import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { ALLOWED_ANALYTICS_EVENTS, anonymousId, sanitizeAnalyticsMetadata } from "@/lib/analytics";

const input = z.object({ eventName: z.enum(ALLOWED_ANALYTICS_EVENTS), metadata: z.record(z.string(), z.unknown()).optional() });
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const jar = await cookies();
  let visitor = jar.get("cubiqlo_visitor_id")?.value;
  if (!visitor) visitor = anonymousId();
  await enforceServerActionRateLimit(`analytics:${visitor}`, visitor, { limit: 60, windowSec: 60 });
  const metadata = sanitizeAnalyticsMetadata(parsed.data.metadata);
  await db.execute(sql`INSERT INTO analytics_events (event_name, anonymous_id, source, medium, campaign, term, content, referrer, referral_id, metadata) VALUES (${parsed.data.eventName}, ${visitor}, ${metadata.source ?? null}, ${metadata.medium ?? null}, ${metadata.campaign ?? null}, ${metadata.term ?? null}, ${metadata.content ?? null}, ${metadata.referrer ?? null}, ${metadata.referralId ?? null}, ${JSON.stringify(metadata)}::jsonb)`);
  const response = NextResponse.json({ ok: true });
  if (!jar.get("cubiqlo_visitor_id")) response.cookies.set("cubiqlo_visitor_id", visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export const runtime = "nodejs";

// ponytail: anonymous event slice only; add authenticated linkage when auth hook exposes stable signup identity.

// analyticsEvents
// enforceServerActionRateLimit
