import { auth } from "@/lib/auth";

// Override Better Auth's built-in /sign-out route.
//
// Why: Better Auth 1.6 strictly requires `Content-Type: application/json` on POST
// requests with a body. The browser-side `authClient.signOut()` (no body, no
// explicit Content-Type) hits 415 "UNSUPPORTED_MEDIA_TYPE". This wrapper builds
// a bodiless internal Request — better-call's getBody() short-circuits on
// `!request.body` and skips the content-type check entirely.
//
// Next.js routes the more specific /api/auth/sign-out over the catch-all
// /api/auth/[...all]/route.ts.

export async function POST(req: Request) {
  const result = await auth.api.signOut({
    headers: req.headers,
    asResponse: true,
  });
  return result;
}
