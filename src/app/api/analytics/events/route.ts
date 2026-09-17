import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import { enforceServerActionRateLimit } from "@/lib/distributed-rate-limit";
import { ALLOWED_ANALYTICS_EVENTS, anonymousId, normalizeAnalyticsPath, sanitizeAnalyticsMetadata } from "@/lib/analytics";
import { auth } from "@/lib/auth";
import { findWorkspaceFullForCurrentUser } from "@/lib/workspace";

const input = z.object({ eventName: z.enum(ALLOWED_ANALYTICS_EVENTS), metadata: z.record(z.string(), z.unknown()).optional() });
export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  const jar = await cookies();
  let visitor = jar.get("cubiqlo_visitor_id")?.value;
  if (!visitor) visitor = anonymousId();
  await enforceServerActionRateLimit(`analytics:${visitor}`, visitor, { limit: 60, windowSec: 60 });
  const metadata = sanitizeAnalyticsMetadata(parsed.data.metadata);
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const workspace = session?.user ? await findWorkspaceFullForCurrentUser().catch(() => null) : null;
  const normalizedPath = parsed.data.eventName === "page_viewed" ? normalizeAnalyticsPath(typeof metadata.path === "string" ? metadata.path : "") : null;
  if (parsed.data.eventName === "page_viewed" && !normalizedPath) return NextResponse.json({ error: "invalid_path" }, { status: 400 });
  const finalMetadata = normalizedPath ? { ...metadata, path: normalizedPath } : metadata;
  await db.execute(sql`INSERT INTO analytics_events (event_name, anonymous_id, user_id, workspace_id, source, medium, campaign, term, content, referrer, referral_id, metadata) VALUES (${parsed.data.eventName}, ${visitor}, ${session?.user?.id ?? null}, ${workspace?.id ?? null}, ${finalMetadata.source ?? null}, ${finalMetadata.medium ?? null}, ${finalMetadata.campaign ?? null}, ${finalMetadata.term ?? null}, ${finalMetadata.content ?? null}, ${finalMetadata.referrer ?? null}, ${finalMetadata.referralId ?? null}, ${JSON.stringify(finalMetadata)}::jsonb)`);
  const response = NextResponse.json({ ok: true });
  if (!jar.get("cubiqlo_visitor_id")) response.cookies.set("cubiqlo_visitor_id", visitor, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: 60 * 60 * 24 * 365 });
  return response;
}
export const runtime = "nodejs";


// analyticsEvents
// enforceServerActionRateLimit
