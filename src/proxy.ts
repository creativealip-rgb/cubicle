import { NextResponse, type NextRequest } from "next/server";
import { logRequest } from "@/lib/logger";

export function proxy(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const duration = Date.now() - start;

  response.headers.set("X-Response-Time", `${duration}ms`);

  // Log API and site requests
  const path = request.nextUrl.pathname;
  if (path.startsWith("/api") || path.startsWith("/site")) {
    logRequest(request.method, path, response.status, duration);
  }

  return response;
}

export const config = {
  matcher: [
    "/api/:path*",
    "/site/:path*",
  ],
};
