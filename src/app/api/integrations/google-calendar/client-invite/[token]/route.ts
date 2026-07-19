import { NextRequest, NextResponse } from "next/server";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { startClientGoogleOAuthFromInvite } from "@/lib/client-google-calendar";

function appOrigin() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.BETTER_AUTH_URL?.replace(/\/$/, "") ||
    "https://cubiqlo.com"
  );
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const origin = appOrigin();
  try {
    if (!isGoogleCalendarConfigured()) {
      return NextResponse.redirect(`${origin}/client-gcal?status=missing_config`);
    }
    const { token } = await ctx.params;
    if (!token?.trim()) {
      return NextResponse.redirect(`${origin}/client-gcal?status=invalid`);
    }
    const started = await startClientGoogleOAuthFromInvite(token.trim());
    return NextResponse.redirect(started.url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invite_failed";
    return NextResponse.redirect(
      `${origin}/client-gcal?status=error&error=${encodeURIComponent(msg)}`,
    );
  }
}
