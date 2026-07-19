import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import {
  parseOAuthState,
  saveGoogleConnectionFromCode,
} from "@/lib/google-calendar";
import {
  isClientOAuthState,
  parseClientOAuthState,
  saveClientGoogleConnectionFromCode,
} from "@/lib/client-google-calendar";

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
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const error = req.nextUrl.searchParams.get("error");

    // Client invite OAuth does NOT require Cubiqlo login
    if (state && isClientOAuthState(state)) {
      if (error) {
        return NextResponse.redirect(
          `${origin}/client-gcal?status=denied&error=${encodeURIComponent(error)}`,
        );
      }
      if (!code) {
        return NextResponse.redirect(`${origin}/client-gcal?status=invalid`);
      }
      const parsed = parseClientOAuthState(state);
      await saveClientGoogleConnectionFromCode({
        clientId: parsed.clientId,
        inviteToken: parsed.inviteToken,
        code,
      });
      return NextResponse.redirect(
        `${origin}/client-gcal?status=connected&clientId=${encodeURIComponent(parsed.clientId)}`,
      );
    }

    // User (workspace) OAuth still requires login
    const session = await auth.api.getSession({ headers: await headers() });
    const user = requireUser(session?.user);

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
    // Heuristic: client flow errors go to public page
    const referer = req.headers.get("referer") || "";
    if (referer.includes("client-invite") || referer.includes("accounts.google.com")) {
      // Prefer client page if state looks client-ish, else settings
    }
    const state = req.nextUrl.searchParams.get("state");
    if (state && isClientOAuthState(state)) {
      return NextResponse.redirect(
        `${origin}/client-gcal?status=error&error=${encodeURIComponent(msg)}`,
      );
    }
    return NextResponse.redirect(
      `${origin}/app/settings?gcal=error&error=${encodeURIComponent(msg)}`,
    );
  }
}
