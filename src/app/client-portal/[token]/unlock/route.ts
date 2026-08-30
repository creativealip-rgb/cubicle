import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@better-auth/utils/password";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { createPortalSession, PORTAL_COOKIE } from "@/lib/portal-password";
import { portalPublicUrl } from "@/lib/portal-redirect";

function portalRedirect(request: Request, path: string) {
  return new NextResponse("Redirecting to client portal", {
    status: 303,
    headers: { location: portalPublicUrl(request, path).toString() },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: slug } = await params;
  return portalRedirect(request, `/client-portal/${slug}`);
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token: slug } = await params;
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const limit = await enforceRateLimit(request, `portal-password:${slug}`, { limit: 8, windowSec: 900 });
  if (!limit.allowed) return portalRedirect(request, `/client-portal/${slug}?error=rate`);
  const [client] = await db.select().from(clients).where(eq(clients.portalSlug, slug));
  const valid = !!client?.portalEnabled && !!client.portalSlugEnabled && !!client.portalPasswordHash
    && await verifyPassword(client.portalPasswordHash, password);
  if (!valid) return portalRedirect(request, `/client-portal/${slug}?error=invalid`);
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return new NextResponse("Portal unavailable", { status: 503 });
  const response = portalRedirect(request, `/client-portal/${slug}`);
  response.cookies.set(PORTAL_COOKIE, createPortalSession(client.id, client.portalSessionVersion, secret), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 86400, path: "/",
  });
  return response;
}
