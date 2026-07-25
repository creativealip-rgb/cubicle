const DEVELOPMENT_FALLBACK_SECRET = "dev-build-placeholder-secret-change-me";

export function resolveBetterAuthSecret(
  value: string | undefined,
  nodeEnv: string | undefined,
): string {
  const secret = value?.trim();

  if (nodeEnv === "production") {
    if (!secret) {
      throw new Error("BETTER_AUTH_SECRET is required in production");
    }
    if (secret === DEVELOPMENT_FALLBACK_SECRET) {
      throw new Error("BETTER_AUTH_SECRET must not use the development fallback in production");
    }
    return secret;
  }

  return secret || DEVELOPMENT_FALLBACK_SECRET;
}
