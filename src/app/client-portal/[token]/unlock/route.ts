import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@better-auth/utils/password";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { createPortalSession, PORTAL_COOKIE } from "@/lib/portal-password";
import { portalPublicUrl } from "@/lib/portal-redirect";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: slug } = await params;
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const limit = await enforceRateLimit(request, `portal-password:${slug}`, { limit: 8, windowSec: 900 });
  if (!limit.allowed) return NextResponse.redirect(portalPublicUrl(request, `/client-portal/${slug}?error=rate`), 303);
  const [client] = await db.select().from(clients).where(eq(clients.portalSlug, slug));
  const valid = !!client?.portalEnabled && !!client.portalSlugEnabled && !!client.portalPasswordHash
    && await verifyPassword(client.portalPasswordHash, password);
  if (!valid) return NextResponse.redirect(portalPublicUrl(request, `/client-portal/${slug}?error=invalid`), 303);
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return new NextResponse("Portal unavailable", { status: 503 });
  const response = NextResponse.redirect(portalPublicUrl(request, `/client-portal/${slug}`), 303);
  response.cookies.set(PORTAL_COOKIE, createPortalSession(client.id, client.portalSessionVersion, secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/",
  });
  return response;
}
