/**
 * Same-origin guard for state-changing API routes.
 *
 * Browsers attach an `Origin` header to cross-origin POST requests, and this
 * header cannot be forged by a browser (unlike `Referer`, which is stripped
 * by sandboxed iframes and some privacy settings). Requiring the request's
 * `Origin` to match the app's own origin — or, in development, the dev
 * origin — blocks drive-by cross-site POSTs (CSRF) to billing/payment
 * endpoints.
 *
 * Pure and side-effect free so it can be unit-tested without a server.
 * NEVER include secrets or provider payloads in the returned message.
 */
export function assertSameOrigin(
  request: Pick<Request, "headers">,
  options: {
    environment?: string;
    appUrl?: string;
    devOrigin?: string;
  } = {},
): void {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  // Header missing or empty (curl, non-browser clients, same-origin GET-like
  // POSTs without CORS): fail closed — billing is browser-only.
  if (!origin) {
    throw new Error("Missing Origin header");
  }

  let expected: string | null = null;
  const appUrl = options.appUrl?.replace(/\/$/, "") || null;
  const env = options.environment ?? process.env.NODE_ENV;

  if (appUrl) {
    expected = appUrl;
  } else if (host) {
    // Fall back to Host header (works for localhost and preview deployments
    // where NEXT_PUBLIC_APP_URL is not set). The full host (incl. port) is
    // carried over, so an attacker cannot smuggle a path or subdomain into
    // the Origin check — the values must match exactly.
    const scheme = env === "development" || host.startsWith("localhost") ? "http" : "https";
    expected = `${scheme}://${host}`;
  } else {
    throw new Error("Missing Host header");
  }

  const allowed = new Set([expected]);
  // Development override: NEXT_PUBLIC_APP_URL may point at the canonical
  // production URL while the dev server actually runs on dev.cubiqlo.com.
  if (env === "development" && options.devOrigin) {
    allowed.add(options.devOrigin.replace(/\/$/, ""));
  }

  if (!allowed.has(origin)) {
    throw new Error("Cross-origin request rejected");
  }
}
