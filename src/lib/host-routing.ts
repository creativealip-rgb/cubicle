export const APP_HOST = "app.cubiqlo.com";
export const ADMIN_HOST = "admin.cubiqlo.com";

const AUTH_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/verify-email/success",
];

function withQuery(origin: string, pathname: string, search: string) {
  return `${origin}${pathname}${search}`;
}

/**
 * Canonical (redirect) rules. Returns a 308 target URL or null to continue.
 */
export function getCanonicalRedirect(
  host: string,
  pathname: string,
  search: string,
  _hasSession: boolean,
): string | null {
  const normalizedHost = host.split(":", 1)[0].toLowerCase();

  if (normalizedHost === "www.cubiqlo.com") {
    return withQuery("https://cubiqlo.com", pathname, search);
  }

  if (normalizedHost === "app.cubiqlo.com" && pathname === "/") {
    return "https://app.cubiqlo.com/app/dashboard";
  }

  if (normalizedHost === "cubiqlo.com") {
    const belongsToApp =
      pathname.startsWith("/app") ||
      pathname.startsWith("/onboarding") ||
      AUTH_PATHS.some((path) => pathname === path);

    if (belongsToApp) {
      return withQuery("https://app.cubiqlo.com", pathname, search);
    }
  }

  // Admin subdomain is ONLY reachable via admin.cubiqlo.com. Any /admin*
  // path arriving on the app host is a user mistyping the URL — send them to
  // the admin subdomain.
  if (
    (normalizedHost === "app.cubiqlo.com" || normalizedHost === "cubiqlo.com") &&
    (pathname === "/admin" || pathname.startsWith("/admin/"))
  ) {
    return withQuery("https://admin.cubiqlo.com", pathname, search);
  }

  return null;
}

/**
 * Transparent rewrite rules for the admin subdomain.
 *
 * admin.cubiqlo.com is the SAME Next app served under a different host, so
 * the App Router must see the internal route path. The control plane lives
 * in the route group `src/app/(admin)/admin/` — i.e. internal paths are
 * `/admin/...` and the admin layout redirects `/admin` → `/admin/dashboard`.
 *
 * To keep visible URLs clean, the proxy rewrites:
 *   admin.cubiqlo.com/            → internal /admin/dashboard
 *   admin.cubiqlo.com/dashboard   → internal /admin/dashboard
 *   admin.cubiqlo.com/users       → internal /admin/users
 *   ... (any path not already /admin-prefixed)
 *   admin.cubiqlo.com/admin/...   → internal /admin/... (already canonical;
 *                                   passed through so internal <Link>s and
 *                                   hard refreshes on visible /admin URLs
 *                                   keep working)
 *
 * Returns the rewritten internal pathname (without search), or null when no
 * rewrite applies (non-admin hosts).
 */
export function getAdminRewritePath(pathname: string): string | null {
  // Auth paths (login/signup/verify/etc.) must pass through UNREWRITTEN on the
  // admin host: rewriting /login → /admin/login hits a non-existent route and
  // 404s. The admin layout's auth guard redirects to /login on the same host,
  // and that redirect target must render normally.
  if (AUTH_PATHS.includes(pathname)) {
    return pathname;
  }
  if (pathname === "/admin" || pathname === "/admin/") {
    return "/admin/dashboard";
  }
  if (pathname.startsWith("/admin/")) {
    return pathname;
  }
  // Post-login landing + app routes: Better Auth redirects authenticated
  // sessions to /app/dashboard, and app links point at /app/... On the admin
  // host those must resolve to the control plane route group, not
  // /admin/app/dashboard (404). Map /app/<x> → /admin/<x>.
  if (pathname === "/app" || pathname === "/app/") {
    return "/admin/dashboard";
  }
  if (pathname.startsWith("/app/")) {
    return `/admin${pathname.slice("/app".length)}`;
  }
  if (pathname === "/") {
    return "/admin/dashboard";
  }
  return `/admin${pathname}`;
}
