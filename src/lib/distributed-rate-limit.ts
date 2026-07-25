import { isIP } from "node:net";
import { createClient, type RedisClientType } from "redis";

export interface RateLimitConfig { limit: number; windowSec: number }
export interface RateLimitResult {
  allowed: boolean; remaining: number; resetAt: number; retryAfterSec: number; degraded: boolean;
}
export interface RateLimitBackend {
  consume(key: string, windowMs: number): Promise<{ count: number; ttlMs: number }>;
}

const LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then redis.call('PEXPIRE', KEYS[1], ARGV[1]); ttl = tonumber(ARGV[1]) end
return {count, ttl}
`;
let client: RedisClientType | null = null;
let connecting: Promise<RedisClientType> | null = null;

async function redisClient(): Promise<RedisClientType> {
  if (client?.isReady) return client;
  if (connecting) return connecting;
  const url = process.env.RATE_LIMIT_REDIS_URL;
  if (!url) throw new Error("RATE_LIMIT_REDIS_URL is not configured");
  const next = createClient({ url, socket: { connectTimeout: 1500, reconnectStrategy: false } });
  next.on("error", (error) => console.error("rate limiter Redis error", error.message));
  connecting = next.connect().then(() => { client = next as RedisClientType; return client; }).finally(() => { connecting = null; });
  return connecting;
}

const redisBackend: RateLimitBackend = {
  async consume(key, windowMs) {
    const redis = await redisClient();
    const value = await redis.eval(LUA, { keys: [key], arguments: [String(windowMs)] }) as [number, number];
    return { count: Number(value[0]), ttlMs: Number(value[1]) };
  },
};

export async function checkDistributedRateLimit(
  key: string,
  config: RateLimitConfig,
  options: { backend?: RateLimitBackend; failureMode?: "open" | "closed" } = {},
): Promise<RateLimitResult> {
  const now = Date.now();
  try {
    const { count, ttlMs } = await (options.backend ?? redisBackend).consume(`cubiqlo:rate:${key}`, config.windowSec * 1000);
    const retryAfterSec = Math.max(1, Math.ceil(ttlMs / 1000));
    return {
      allowed: count <= config.limit,
      remaining: Math.max(0, config.limit - count),
      resetAt: now + ttlMs,
      retryAfterSec,
      degraded: false,
    };
  } catch (error) {
    console.error("distributed rate limiter unavailable", error);
    if ((options.failureMode ?? "closed") === "closed") throw new Error("Rate limiter unavailable");
    return { allowed: true, remaining: config.limit, resetAt: now + config.windowSec * 1000, retryAfterSec: config.windowSec, degraded: true };
  }
}

function validIp(value: string | null): string | null {
  if (!value) return null;
  const candidate = value.trim().replace(/^\[|\]$/g, "");
  return isIP(candidate) ? candidate : null;
}

export function getTrustedClientIp(request: Request): string {
  return validIp(request.headers.get("cf-connecting-ip"))
    ?? validIp(request.headers.get("x-forwarded-for")?.split(",")[0] ?? null)
    ?? validIp(request.headers.get("x-real-ip"))
    ?? "unknown";
}

export function rateLimitHeaders(result: RateLimitResult, config: RateLimitConfig): Record<string, string> {
  return {
    "Retry-After": String(result.retryAfterSec),
    "X-RateLimit-Limit": String(config.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}

export async function enforceRateLimit(request: Request, scope: string, config: RateLimitConfig, options: { identity?: string; failureMode?: "open" | "closed" } = {}) {
  const identity = options.identity ?? getTrustedClientIp(request);
  return checkDistributedRateLimit(`${scope}:${identity}`, config, { failureMode: options.failureMode });
}

export async function enforceRateLimitResponse(request: Request, scope: string, config: RateLimitConfig, options: { identity?: string; failureMode?: "open" | "closed" } = {}): Promise<Response | null> {
  try {
    const result = await enforceRateLimit(request, scope, config, options);
    if (!result.allowed) return Response.json({ error: "Too many requests" }, { status: 429, headers: rateLimitHeaders(result, config) });
    return null;
  } catch {
    return Response.json({ error: "Rate limiter unavailable" }, { status: 503, headers: { "Retry-After": "5" } });
  }
}

export async function closeRateLimitBackend() {
  if (client?.isOpen) await client.quit();
  client = null;
}

export async function enforceServerActionRateLimit(scope: string, identity: string, config: RateLimitConfig) {
  const { headers } = await import("next/headers");
  const h = await headers();
  const request = new Request("http://internal", { headers: h });
  const result = await enforceRateLimit(request, scope, config, { identity });
  if (!result.allowed) throw new Error(`Too many requests. Retry after ${result.retryAfterSec} seconds.`);
  return result;
}


