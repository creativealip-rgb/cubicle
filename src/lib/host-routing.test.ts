import { describe, expect, it } from "vitest";
import { getCanonicalRedirect } from "./host-routing";

describe("getCanonicalRedirect", () => {
  it("redirects www to canonical apex while preserving path and query", () => {
    expect(getCanonicalRedirect("www.cubiqlo.com", "/pricing", "?ref=ads", false)).toBe(
      "https://cubiqlo.com/pricing?ref=ads",
    );
  });

  it("keeps apex landing for guests", () => {
    expect(getCanonicalRedirect("cubiqlo.com", "/", "", false)).toBeNull();
  });

  it("redirects logged-in apex landing visitors to app dashboard", () => {
    expect(getCanonicalRedirect("cubiqlo.com", "/", "", true)).toBe(
      "https://app.cubiqlo.com/app/dashboard",
    );
  });

  it("redirects apex auth pages to app host and preserves query", () => {
    expect(getCanonicalRedirect("cubiqlo.com", "/login", "?redirect=%2Fapp%2Ftasks", false)).toBe(
      "https://app.cubiqlo.com/login?redirect=%2Fapp%2Ftasks",
    );
  });

  it("redirects apex app routes to app host", () => {
    expect(getCanonicalRedirect("cubiqlo.com", "/app/tasks", "?status=open", true)).toBe(
      "https://app.cubiqlo.com/app/tasks?status=open",
    );
  });

  it("redirects app root to dashboard", () => {
    expect(getCanonicalRedirect("app.cubiqlo.com", "/", "", false)).toBe(
      "https://app.cubiqlo.com/app/dashboard",
    );
  });
});
