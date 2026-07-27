import { afterEach, describe, expect, it } from "vitest";
import { resolveBetterAuthSecret } from "./auth-secret";

const DEV_FALLBACK = "dev-build-placeholder-secret-change-me";
const BUILD_PLACEHOLDER = "cubiqlo-build-only-placeholder-secret-not-valid-at-runtime";

describe("resolveBetterAuthSecret", () => {
  afterEach(() => {
    delete process.env.NEXT_PHASE;
  });
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

  it("allows a build-only placeholder during Next.js production build", () => {
    process.env.NEXT_PHASE = "phase-production-build";
    expect(resolveBetterAuthSecret(undefined, "production")).toBe(BUILD_PLACEHOLDER);
  });

  it("rejects the build placeholder at runtime", () => {
    expect(() => resolveBetterAuthSecret(BUILD_PLACEHOLDER, "production")).toThrow(
      "BETTER_AUTH_SECRET must not use the build placeholder at runtime",
    );
  });

  it("allows the development fallback outside production", () => {
    expect(resolveBetterAuthSecret(undefined, "development")).toBe(DEV_FALLBACK);
  });
});
