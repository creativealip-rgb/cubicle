import { describe, expect, it } from "vitest";
import { getAuthEnvironmentOptions } from "./auth-environment";

describe("getAuthEnvironmentOptions", () => {
  it("uses shared production cookies for the canonical app host", () => {
    expect(getAuthEnvironmentOptions("https://app.cubiqlo.com", "production")).toEqual({
      cookiePrefix: "better-auth",
      crossSubDomainCookies: { enabled: true, domain: ".cubiqlo.com" },
    });
  });

  it("uses isolated host-only cookies for dev.cubiqlo.com", () => {
    expect(getAuthEnvironmentOptions("https://dev.cubiqlo.com", "development")).toEqual({
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
