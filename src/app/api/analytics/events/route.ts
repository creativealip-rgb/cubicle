import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
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
  await db.insert(analyticsEvents).values({ eventName: parsed.data.eventName, anonymousId: visitor, metadata: sanitizeAnalyticsMetadata(parsed.data.metadata) });
  const response = NextResponse.json({ ok: true });
  if (!jar.get("cubiqlo_visitor_id")) response.cookies.set("cubiqlo_visitor_id", visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export const runtime = "nodejs";

// ponytail: anonymous event slice only; add authenticated linkage when auth hook exposes stable signup identity.

// analyticsEvents
// enforceServerActionRateLimit
