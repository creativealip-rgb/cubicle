import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, developmentOrigins } from "./security-headers";

describe("contentSecurityPolicy", () => {
  it("allows Next development runtime only on dev", () => {
    const policy = contentSecurityPolicy("development");
    expect(policy).toContain("script-src 'self' 'unsafe-inline' 'unsafe-eval'");
    expect(policy).toContain("wss://dev.cubiqlo.com");
  });

  it("keeps production policy strict", () => {
    const policy = contentSecurityPolicy("production");
    expect(policy).toContain("script-src 'self' 'unsafe-inline'");
    expect(policy).not.toContain("'unsafe-eval'");
    expect(policy).not.toContain("dev.cubiqlo.com");
  });

  it("allows the public dev hostname only during development", () => {
    expect(developmentOrigins("development")).toEqual(["dev.cubiqlo.com"]);
    expect(developmentOrigins("production")).toBeUndefined();
  });

  it("enforces hardened baseline directives in production", () => {
    const policy = contentSecurityPolicy("production");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("whitelists only trusted embed frame sources", () => {
    const policy = contentSecurityPolicy("production");
    expect(policy).toContain("frame-src");
    expect(policy).toContain("https://www.youtube.com");
    expect(policy).toContain("https://player.vimeo.com");
    expect(policy).not.toContain("frame-src *");
    expect(policy).not.toContain("frame-src 'unsafe-inline'");
  });
});
