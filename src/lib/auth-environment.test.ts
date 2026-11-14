import { describe, expect, it } from "vitest";
import { getAuthEnvironmentOptions } from "./auth-environment";

describe("getAuthEnvironmentOptions", () => {
  it("uses shared production cookies for the canonical app host", () => {
    expect(getAuthEnvironmentOptions("https://app.koobikel.com", "production")).toEqual({
      cookiePrefix: "better-auth",
      crossSubDomainCookies: { enabled: true, domain: ".koobikel.com" },
    });
  });

  it("uses isolated host-only cookies for dev.koobikel.com", () => {
    expect(getAuthEnvironmentOptions("https://dev.koobikel.com", "development")).toEqual({
      cookiePrefix: "cubiqlo_dev",
      crossSubDomainCookies: { enabled: false },
    });
  });

  it("uses isolated cookies for localhost development", () => {
    expect(getAuthEnvironmentOptions("http://localhost:3000", "development")).toEqual({
      cookiePrefix: "cubiqlo_dev",
      crossSubDomainCookies: { enabled: false },
    });
  });
});
