import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "./same-origin";

function req(headers: Record<string, string>) {
  return { headers: new Headers(headers) } as unknown as Request;
}

describe("assertSameOrigin", () => {
  it("accepts a request whose Origin matches the configured app URL", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://app.cubiqlo.com", host: "app.cubiqlo.com" }), {
        appUrl: "https://app.cubiqlo.com",
        environment: "production",
      }),
    ).not.toThrow();
  });

  it("accepts trailing-slash app URL against origin without one", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://app.cubiqlo.com" }), {
        appUrl: "https://app.cubiqlo.com/",
        environment: "production",
      }),
    ).not.toThrow();
  });

  it("rejects a cross-origin request (attacker site)", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://evil.example", host: "app.cubiqlo.com" }), {
        appUrl: "https://app.cubiqlo.com",
        environment: "production",
      }),
    ).toThrow(/Cross-origin/);
  });

  it("rejects path/port smuggling in Origin when only Host fallback is available", () => {
    expect(() =>
      assertSameOrigin(
        req({ origin: "https://app.cubiqlo.com.evil.example:8443", host: "app.cubiqlo.com" }),
        { environment: "production" },
      ),
    ).toThrow(/Cross-origin/);
  });

  it("fails closed when the Origin header is missing", () => {
    expect(() => assertSameOrigin(req({ host: "app.cubiqlo.com" }), { environment: "production" })).toThrow(
      /Missing Origin/,
    );
  });

  it("fails closed when both Origin and Host are missing", () => {
    expect(() => assertSameOrigin(req({}), { environment: "production" })).toThrow(/Missing Origin/);
  });

  it("accepts the dev origin in development when app URL is the canonical one", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://dev.cubiqlo.com", host: "dev.cubiqlo.com" }), {
        appUrl: "https://cubiqlo.com",
        devOrigin: "https://dev.cubiqlo.com",
        environment: "development",
      }),
    ).not.toThrow();
  });

  it("rejects the dev origin in production", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "https://dev.cubiqlo.com", host: "dev.cubiqlo.com" }), {
        appUrl: "https://cubiqlo.com",
        devOrigin: "https://dev.cubiqlo.com",
        environment: "production",
      }),
    ).toThrow(/Cross-origin/);
  });

  it("accepts localhost Host fallback in development (http)", () => {
    expect(() =>
      assertSameOrigin(req({ origin: "http://localhost:3000", host: "localhost:3000" }), {
        environment: "development",
      }),
    ).not.toThrow();
  });

  it("never includes the origin value or secrets in the error message", () => {
    try {
      assertSameOrigin(req({ origin: "https://evil.example", host: "app.cubiqlo.com" }), {
        environment: "production",
      });
      throw new Error("expected throw");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      expect(message).not.toContain("evil");
      expect(message).not.toContain("app.cubiqlo.com");
    }
  });
});
