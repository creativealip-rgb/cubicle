import { type NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

import { getCanonicalRedirect } from "@/lib/host-routing"
import { getAuthEnvironmentOptions } from "@/lib/auth-environment"

const authEnvironment = getAuthEnvironmentOptions(
  process.env.BETTER_AUTH_URL,
  process.env.NODE_ENV,
)

const protectedPrefixes = ["/app", "/onboarding"]


export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") || ""

  // Redirect sslip.io domains to cubiqlo.com
  if (host.includes("sslip.io")) {
    const url = new URL(`https://cubiqlo.com${pathname}`)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 301)
  }


  const sessionCookie = getSessionCookie(request, {
    cookiePrefix: authEnvironment.cookiePrefix,
  })
  const canonicalRedirect = getCanonicalRedirect(
    host,
    pathname,
    request.nextUrl.search,
    Boolean(sessionCookie),
  )
  if (canonicalRedirect) {
    return NextResponse.redirect(canonicalRedirect, 308)
  }

  // Protected routes: no session → redirect to login on the same host.
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Catch all paths for protected/auth routes + rate limiting
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
