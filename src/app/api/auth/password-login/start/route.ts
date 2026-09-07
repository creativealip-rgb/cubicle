import { NextResponse } from "next/server";
import { sanitizeCallbackUrl, validateLoginInput } from "@/lib/auth-login/service";

const disabled = () => NextResponse.json({ status: "disabled", fallback: "/api/auth/sign-in/email" }, { status: 404 });

export async function POST(request: Request) {
  if (process.env.PASSWORD_LOGIN_CHALLENGE_ENABLED !== "true") return disabled();
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
  const parsed = validateLoginInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  // OTP/session orchestration remains behind feature gate until verify endpoint lands.
  return NextResponse.json({ status: "otp_required", maskedEmail: parsed.value.email.replace(/^(.).+(@.*)$/, "$1***$2"), expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(), redirectTo: sanitizeCallbackUrl((body as Record<string, unknown>).callbackUrl) });
}

export const GET = disabled;
