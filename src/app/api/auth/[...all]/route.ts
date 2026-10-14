import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { enforceRateLimit, getTrustedClientIp, rateLimitHeaders } from "@/lib/distributed-rate-limit";

const handlers = toNextJsHandler(auth);
const config = { limit: 10, windowSec: 60 };

export async function GET(request: Request) {
  try {
    const rate = await enforceRateLimit(request, "auth", config);
    if (!rate.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate, config) });
    const response = await handlers.GET(request);
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(rateLimitHeaders(rate, config))) headers.set(key, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  } catch {
    return Response.json({ error: "Rate limiter unavailable" }, { status: 503, headers: { "Retry-After": "5" } });
  }
}
export async function POST(request: Request) {
  const strict = request.url.includes("sign-in") ? { limit: 5, windowSec: 300 } : config;
  let identity: string | undefined;
  if (request.url.includes("sign-in")) {
    try {
      const body = await request.clone().json() as { email?: unknown };
      if (typeof body.email === "string" && body.email.trim()) identity = `${body.email.trim().toLowerCase()}:${getTrustedClientIp(request)}`;
    } catch {}
  }
  try {
    const rate = await enforceRateLimit(request, "auth", strict, { identity });
    if (!rate.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate, strict) });
    return handlers.POST(request);
  } catch {
    return Response.json({ error: "Rate limiter unavailable" }, { status: 503, headers: { "Retry-After": "5" } });
  }
}
