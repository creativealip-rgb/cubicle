import { NextResponse, type NextRequest } from "next/server";
import { logRequest } from "@/lib/logger";
import { getCanonicalRedirect } from "@/lib/host-routing";

export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const { pathname, search } = request.nextUrl;

  const target = getCanonicalRedirect(host, pathname, search, false);
  if (target) {
    return NextResponse.redirect(target, 308);
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

