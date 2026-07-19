import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireUser } from "@/lib/access";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  isGoogleCalendarConfigured,
} from "@/lib/google-calendar";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.redirect(
      new URL(
        "/app/settings?gcal=missing_config",
        process.env.NEXT_PUBLIC_APP_URL || "https://cubiqlo.com",
      ),
    );
  }

  const state = createOAuthState(user.id);
  const url = buildGoogleAuthUrl(state);
  return NextResponse.redirect(url);
}
