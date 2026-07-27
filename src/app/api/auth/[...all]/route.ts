import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { enforceRateLimit, rateLimitHeaders } from "@/lib/distributed-rate-limit";

const handlers = toNextJsHandler(auth);
const config = { limit: 10, windowSec: 60 };

export const GET = handlers.GET;
export async function POST(request: Request) {
  const strict = request.url.includes("sign-in") ? { limit: 5, windowSec: 300 } : config;
  try {
    const rate = await enforceRateLimit(request, "auth", strict);
    if (!rate.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(rate, strict) });
    return handlers.POST(request);
  } catch {
    return Response.json({ error: "Rate limiter unavailable" }, { status: 503, headers: { "Retry-After": "5" } });
  }
}
