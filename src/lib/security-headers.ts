export type RuntimeEnvironment = "development" | "production" | "test";

export function developmentOrigins(environment: RuntimeEnvironment) {
  return environment === "development" ? ["dev.cubiqlo.com"] : undefined;
}

export function contentSecurityPolicy(
  environment: RuntimeEnvironment,
): string {
  const isDevelopment = environment === "development";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    [
      "connect-src 'self'",
      "https://cubiqlo.com",
      "wss://cubiqlo.com",
      "https://app.cubiqlo.com",
      "wss://app.cubiqlo.com",
      ...(isDevelopment
        ? ["https://dev.cubiqlo.com", "wss://dev.cubiqlo.com"]
        : []),
      "https://*.r2.cloudflarestorage.com",
    ].join(" "),
    "frame-ancestors 'none'",
  ].join("; ");
}
