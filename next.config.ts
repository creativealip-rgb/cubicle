import type { NextConfig } from "next";
import { version } from "./package.json";
import {
  contentSecurityPolicy,
  developmentOrigins,
  type RuntimeEnvironment,
} from "./src/lib/security-headers";

const runtimeEnvironment = (process.env.NODE_ENV ||
  "production") as RuntimeEnvironment;

const nextConfig: NextConfig = {
  output: "standalone",
  deploymentId: process.env.NEXT_DEPLOYMENT_ID,
  poweredByHeader: false,
  allowedDevOrigins: developmentOrigins(runtimeEnvironment),

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
            value: contentSecurityPolicy(runtimeEnvironment),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
