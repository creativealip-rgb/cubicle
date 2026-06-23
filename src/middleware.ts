import { type NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"
import { checkRateLimit, getClientIp } from "@/lib/rate-limit"

const protectedPrefixes = ["/app", "/onboarding"]
const authPages = ["/login", "/signup", "/forgot-password"]

// Rate limit config for auth endpoints
const AUTH_RATE_LIMIT = { limit: 10, windowSec: 60 } // 10 req/min per IP
const LOGIN_RATE_LIMIT = { limit: 5, windowSec: 300 } // 5 req/5min per IP (stricter)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") || ""

  // Redirect sslip.io domains to cubiqlo.com
  if (host.includes("sslip.io")) {
    const url = new URL(`https://cubiqlo.com${pathname}`)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 301)
  }

  // Rate limit auth API endpoints
  if (pathname.startsWith("/api/auth")) {
    const ip = getClientIp(request)
    const isLogin = pathname.includes("sign-in") || pathname.includes("login")
    const config = isLogin ? LOGIN_RATE_LIMIT : AUTH_RATE_LIMIT
    const { allowed, remaining, resetAt } = checkRateLimit(`auth:${ip}`, config)

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000)
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(config.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(resetAt / 1000)),
          },
        },
      )
    }

    // Continue with rate limit headers
    const response = NextResponse.next()
    response.headers.set("X-RateLimit-Limit", String(config.limit))
    response.headers.set("X-RateLimit-Remaining", String(remaining))
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)))
    return response
  }

  const sessionCookie = getSessionCookie(request)

  // Protected routes: no session → redirect to login
  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p))
  if (isProtected && !sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Auth pages: already logged in → redirect to app
  const isAuthPage = authPages.some((p) => pathname === p)
  if (isAuthPage && sessionCookie) {
    return NextResponse.redirect(new URL("/app/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    // Catch all paths for protected/auth routes + rate limiting
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
