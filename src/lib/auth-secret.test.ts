import { describe, expect, it } from "vitest";
import { resolveBetterAuthSecret } from "./auth-secret";

const DEV_FALLBACK = "dev-build-placeholder-secret-change-me";

describe("resolveBetterAuthSecret", () => {
  it("rejects a missing secret in production", () => {
    expect(() => resolveBetterAuthSecret(undefined, "production")).toThrow(
      "BETTER_AUTH_SECRET is required in production",
    );
  });

  it("rejects a blank secret in production", () => {
    expect(() => resolveBetterAuthSecret("   ", "production")).toThrow(
      "BETTER_AUTH_SECRET is required in production",
    );
  });

  it("rejects the public development fallback in production", () => {
    expect(() => resolveBetterAuthSecret(DEV_FALLBACK, "production")).toThrow(
      "BETTER_AUTH_SECRET must not use the development fallback in production",
    );
  });

  it("returns a configured production secret", () => {
    expect(resolveBetterAuthSecret("production-secret-value", "production")).toBe(
      "production-secret-value",
    );
  });

  it("allows the development fallback outside production", () => {
    expect(resolveBetterAuthSecret(undefined, "development")).toBe(DEV_FALLBACK);
  });
});
