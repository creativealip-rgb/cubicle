import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,

  // Expose app version (single source of truth: package.json) to the client bundle.
  env: {
    NEXT_PUBLIC_APP_VERSION: version,
  },

  // Allow larger multipart bodies for same-origin file/receipt uploads (proxy path).
  experimental: {
    serverActions: {
      bodySizeLimit: "30mb",
    },
  },

  async headers() {
    return [
      {
        // Apply to all routes
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data:",
              // R2 presigned PUT/GET lives on *.r2.cloudflarestorage.com.
              // Without this, browser blocks the request and surfaces
              // "Network error during upload" / "failed to fetch".
              "connect-src 'self' https://cubiqlo.com wss://cubiqlo.com https://app.cubiqlo.com wss://app.cubiqlo.com https://*.r2.cloudflarestorage.com",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
