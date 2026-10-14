import { describe, expect, it } from "vitest";
import { getTrustedClientIp } from "./distributed-rate-limit";

describe("distributed rate-limit identity", () => {
  it("extracts a valid client IP from x-forwarded-for", () => {
    const request = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getTrustedClientIp(request)).toBe("1.2.3.4");
  });

  it("prefers Cloudflare connecting IP", () => {
    const request = new Request("http://localhost", {
      headers: {
        "cf-connecting-ip": "9.8.7.6",
        "x-forwarded-for": "1.2.3.4",
      },
    });
    expect(getTrustedClientIp(request)).toBe("9.8.7.6");
  });

  it("rejects malformed forwarded IP and falls back to real IP", () => {
    const request = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "not-an-ip",
        "x-real-ip": "10.0.0.4",
      },
    });
    expect(getTrustedClientIp(request)).toBe("10.0.0.4");
  });

  it("returns unknown when no valid proxy identity exists", () => {
    expect(getTrustedClientIp(new Request("http://localhost"))).toBe("unknown");
  });
});
