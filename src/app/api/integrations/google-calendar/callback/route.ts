import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import {
  parseOAuthState,
  saveGoogleConnectionFromCode,
} from "@/lib/google-calendar";

function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://cubiqlo.com"
  );
}

export async function GET(req: NextRequest) {
  const origin = appOrigin();
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);

    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${origin}/app/settings?gcal=denied&error=${encodeURIComponent(error)}`,
      );
    }
    if (!code || !state) {
      return NextResponse.redirect(`${origin}/app/settings?gcal=invalid`);
    }

    const parsed = parseOAuthState(state);
    if (parsed.userId !== user.id) {
      return NextResponse.redirect(`${origin}/app/settings?gcal=state_mismatch`);
    }

    await saveGoogleConnectionFromCode(user.id, code);
    return NextResponse.redirect(`${origin}/app/settings?gcal=connected`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "connect_failed";
    return NextResponse.redirect(
      `${origin}/app/settings?gcal=error&error=${encodeURIComponent(msg)}`,
    );
  }
}
