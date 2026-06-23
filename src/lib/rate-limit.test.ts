import { describe, it, expect, beforeEach } from "vitest"
import { checkRateLimit, getClientIp } from "./rate-limit"

describe("rate-limit", () => {
  beforeEach(() => {
    // Reset store between tests via the module's internal state
    // The store is module-level, so we test with unique keys
  })

  describe("checkRateLimit", () => {
    it("allows requests within limit", () => {
      const key = `test-${Date.now()}-within`
      const result = checkRateLimit(key, { limit: 3, windowSec: 60 })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(2)
    })

    it("blocks requests over limit", () => {
      const key = `test-${Date.now()}-over`
      const config = { limit: 2, windowSec: 60 }
      checkRateLimit(key, config)
      checkRateLimit(key, config)
      const result = checkRateLimit(key, config)
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it("resets after window expires", () => {
      const key = `test-${Date.now()}-reset`
      const config = { limit: 1, windowSec: 1 }
      checkRateLimit(key, config)
      const blocked = checkRateLimit(key, config)
      expect(blocked.allowed).toBe(false)

      // Wait for window to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const result = checkRateLimit(key, config)
          expect(result.allowed).toBe(true)
          resolve()
        }, 1100)
      })
    })

    it("tracks remaining correctly", () => {
      const key = `test-${Date.now()}-remaining`
      const config = { limit: 5, windowSec: 60 }
      const r1 = checkRateLimit(key, config)
      expect(r1.remaining).toBe(4)
      const r2 = checkRateLimit(key, config)
      expect(r2.remaining).toBe(3)
    })
  })

  describe("getClientIp", () => {
    it("extracts IP from x-forwarded-for", () => {
      const request = new Request("http://localhost", {
        headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
      })
      expect(getClientIp(request)).toBe("1.2.3.4")
    })

    it("extracts IP from x-real-ip", () => {
      const request = new Request("http://localhost", {
        headers: { "x-real-ip": "9.8.7.6" },
      })
      expect(getClientIp(request)).toBe("9.8.7.6")
    })

    it("returns unknown when no headers", () => {
      const request = new Request("http://localhost")
      expect(getClientIp(request)).toBe("unknown")
    })
  })
})
