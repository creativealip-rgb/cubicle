import { NextResponse, type NextRequest } from "next/server";
import { getAdminRewritePath, getCanonicalRedirect } from "@/lib/host-routing";

function isSensitiveProbePath(pathname: string) {
  return /(?:^|\/)(?:\.env(?:\.|$)|\.git(?:\/|$)|phpinfo\.php$)/i.test(pathname);
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;
  const normalizedHost = host.split(":", 1)[0].toLowerCase();

  if (isSensitiveProbePath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  const target = getCanonicalRedirect(host, pathname, search, false);
  if (target) {
    return NextResponse.redirect(target, 308);
  }

  // Superadmin subdomain: serve the SAME app, rewritten to the (admin) route
  // group. Transparent to the browser — visible URLs stay /dashboard, /users,
  // etc., while internally Next serves /admin/dashboard, /admin/users.
  if (normalizedHost === "admin.cubiqlo.com") {
    // Public brand assets live at the root; do not rewrite them into /admin/*.
    if (pathname === "/logo-icon.png" || pathname === "/favicon-32.png") {
      return NextResponse.next();
    }
    const rewritten = getAdminRewritePath(pathname);
    if (rewritten && rewritten !== pathname) {
      const url = request.nextUrl.clone();
      url.pathname = rewritten;
      return NextResponse.rewrite(url);
    }
  }

  const response = NextResponse.next();

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
