import { type NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const protectedPrefixes = ["/app", "/onboarding"]
const authPages = ["/login", "/signup", "/forgot-password"]

const SSLIP_HOSTS = [
  "cubicle.168-144-37-19.sslip.io",
  "cubicle.168.144.37.19.sslip.io",
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = request.headers.get("host") || ""

  // Redirect sslip.io domains to cubiqlo.com
  if (SSLIP_HOSTS.some((h) => host.startsWith(h))) {
    const url = new URL(`https://cubiqlo.com${pathname}`)
    url.search = request.nextUrl.search
    return NextResponse.redirect(url, 301)
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
    // Catch all paths for sslip redirect + protected/auth routes
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
}
