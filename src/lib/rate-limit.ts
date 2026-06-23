/**
 * Simple in-memory rate limiter for auth endpoints.
 * Tracks requests by IP address.
 * For production, consider Redis-backed rate limiting.
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key)
  }
}, 5 * 60 * 1000)

export interface RateLimitConfig {
  /** Max requests in the window */
  limit: number
  /** Window duration in seconds */
  windowSec: number
}

/**
 * Check rate limit for a given key (typically IP address).
 * Returns { allowed, remaining, resetAt }.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = { limit: 10, windowSec: 60 },
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    // New window
    const resetAt = now + config.windowSec * 1000
    store.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: config.limit - 1, resetAt }
  }

  if (entry.count >= config.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { allowed: true, remaining: config.limit - entry.count, resetAt: entry.resetAt }
}

/**
 * Get client IP from request headers.
 * Handles proxied requests (Cloudflare, Traefik, etc.)
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp
  return "unknown"
}
