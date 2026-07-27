import { describe, expect, it, vi } from "vitest";
import {
  checkDistributedRateLimit,
  getTrustedClientIp,
  rateLimitHeaders,
  type RateLimitBackend,
} from "./distributed-rate-limit";

const config = { limit: 2, windowSec: 60 };

describe("distributed rate limiter", () => {
  it("uses one atomic backend operation and maps count/reset", async () => {
    const consume = vi.fn().mockResolvedValue({ count: 1, ttlMs: 59_500 });
    const backend: RateLimitBackend = { consume };
    const result = await checkDistributedRateLimit("auth:1.2.3.4", config, { backend });
    expect(consume).toHaveBeenCalledOnce();
    expect(consume).toHaveBeenCalledWith("cubiqlo:rate:auth:1.2.3.4", 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
    expect(result.retryAfterSec).toBe(60);
  });

  it("blocks atomically when shared count exceeds limit", async () => {
    const backend: RateLimitBackend = {
      consume: vi.fn().mockResolvedValue({ count: 3, ttlMs: 14_001 }),
    };
    const result = await checkDistributedRateLimit("auth:shared", config, { backend });
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterSec).toBe(15);
  });

  it("fails closed for sensitive operations when backend is unavailable", async () => {
    const backend: RateLimitBackend = {
      consume: vi.fn().mockRejectedValue(new Error("redis down")),
    };
    await expect(
      checkDistributedRateLimit("webhook:1", config, { backend, failureMode: "closed" }),
    ).rejects.toThrow("Rate limiter unavailable");
  });

  it("fails open only when explicitly requested", async () => {
    const backend: RateLimitBackend = {
      consume: vi.fn().mockRejectedValue(new Error("redis down")),
    };
    const result = await checkDistributedRateLimit("pdf:1", config, {
      backend,
      failureMode: "open",
    });
    expect(result.allowed).toBe(true);
    expect(result.degraded).toBe(true);
  });

  it("uses Cloudflare connecting IP before proxy-generated forwarding headers", () => {
    const request = new Request("https://cubiqlo.com", {
      headers: {
        "cf-connecting-ip": "203.0.113.9",
        "x-forwarded-for": "198.51.100.8, 10.0.0.2",
        "x-real-ip": "10.0.0.2",
      },
    });
    expect(getTrustedClientIp(request)).toBe("203.0.113.9");
  });

  it("rejects malformed forwarded values and falls back safely", () => {
    const request = new Request("https://cubiqlo.com", {
      headers: { "x-forwarded-for": "evil-value", "x-real-ip": "10.0.0.4" },
    });
    expect(getTrustedClientIp(request)).toBe("10.0.0.4");
  });

  it("emits standard 429 metadata", () => {
    const headers = rateLimitHeaders({
      allowed: false,
      remaining: 0,
      resetAt: 1_700_000_060_000,
      retryAfterSec: 60,
      degraded: false,
    }, config);
    expect(headers["Retry-After"]).toBe("60");
    expect(headers["X-RateLimit-Limit"]).toBe("2");
    expect(headers["X-RateLimit-Remaining"]).toBe("0");
  });
});
