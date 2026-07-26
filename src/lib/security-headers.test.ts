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
});
