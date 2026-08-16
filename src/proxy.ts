import { NextResponse, type NextRequest } from "next/server";
import { logRequest } from "@/lib/logger";
import { getAdminRewritePath, getCanonicalRedirect } from "@/lib/host-routing";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;
  const normalizedHost = host.split(":", 1)[0].toLowerCase();

  const target = getCanonicalRedirect(host, pathname, search, false);
  if (target) {
    return NextResponse.redirect(target, 308);
  }

  // Superadmin subdomain: serve the SAME app, rewritten to the (admin) route
  // group. Transparent to the browser — visible URLs stay /dashboard, /users,
  // etc., while internally Next serves /admin/dashboard, /admin/users.
  if (normalizedHost === "admin.cubiqlo.com") {
    const rewritten = getAdminRewritePath(pathname);
    if (rewritten && rewritten !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = rewritten;
      return NextResponse.rewrite(url);
    }
  }

  const start = Date.now();
  const response = NextResponse.next();
  const duration = Date.now() - start;

  response.headers.set("X-Response-Time", `${duration}ms`);

  // Log API and site requests
  if (pathname.startsWith("/api") || pathname.startsWith("/site")) {
    logRequest(request.method, pathname, response.status, duration);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
