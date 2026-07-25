const DEVELOPMENT_FALLBACK_SECRET = "dev-build-placeholder-secret-change-me";
const PRODUCTION_BUILD_PLACEHOLDER_SECRET =
  "cubiqlo-build-only-placeholder-secret-not-valid-at-runtime";

export function resolveBetterAuthSecret(
  value: string | undefined,
  nodeEnv: string | undefined,
): string {
  const secret = value?.trim();
  const isProductionBuild =
    nodeEnv === "production" && process.env.NEXT_PHASE === "phase-production-build";

  if (nodeEnv === "production") {
    if (!secret) {
      if (isProductionBuild) {
        return PRODUCTION_BUILD_PLACEHOLDER_SECRET;
      }
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }
    if (secret === DEVELOPMENT_FALLBACK_SECRET) {
      throw new Error("BETTER_AUTH_SECRET must not use the development fallback in production");
    }
    if (secret === PRODUCTION_BUILD_PLACEHOLDER_SECRET && !isProductionBuild) {
      throw new Error("BETTER_AUTH_SECRET must not use the build placeholder at runtime");
    }
    return secret;
  }

  return secret || DEVELOPMENT_FALLBACK_SECRET;
}
