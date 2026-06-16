import { type NextRequest, NextResponse } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

const protectedPrefixes = ["/app", "/onboarding"]
const authPages = ["/login", "/signup", "/forgot-password"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
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
  matcher: ["/app/:path*", "/onboarding/:path*", "/login", "/signup", "/forgot-password"],
}
