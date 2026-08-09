export type RuntimeEnvironment = "development" | "production" | "test";

export function developmentOrigins(environment: RuntimeEnvironment) {
  return environment === "development" ? ["dev.cubiqlo.com"] : undefined;
}

export function contentSecurityPolicy(
  environment: RuntimeEnvironment,
): string {
  const isDevelopment = environment === "development";

  return [
    // Hardened baseline directives
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    // Force HTTPS for any accidental http:// subresource references
    "upgrade-insecure-requests",

    // Next.js app router requires inline scripts for hydration data;
    // 'unsafe-eval' stays dev-only.
    `script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com${isDevelopment ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",

    // img-src stays broad (https:) because landing builder galleries
    // accept user-provided external image URLs; data:/blob: cover uploads.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",

    // Media embeds (YouTube / Maps / Vimeo). Without frame-src the
    // default-src 'self' fallback blocks every external embed — this
    // directive makes the builder's embed section actually work.
    "frame-src https://www.youtube.com https://youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com https://maps.google.com",

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
      "https://cloudflareinsights.com",
      "https://*.cloudflareinsights.com",
    ].join(" "),
  ].join("; ");
}
