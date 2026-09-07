import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { db } from "@/db";
import { authRecoveryHandoffs, passkeys, users } from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { hashVerifier } from "@/lib/auth-login/crypto";

const COOKIE = "cubiqlo.recovery_passkey";
export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Recovery unavailable" },
      { status: 503 },
    );
  const email = String(
    ((await request.json().catch(() => ({}))) as { email?: unknown }).email ??
      "",
  )
    .trim()
    .toLowerCase();
  const limited = await enforceRateLimit(
    request,
    "passkey-recovery-start",
    { limit: 5, windowSec: 900 },
    { identity: email || "missing", failureMode: "closed" },
  );
  if (!limited.allowed) return NextResponse.json({ status: "continue" });
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  const keys = user
    ? await db.select().from(passkeys).where(eq(passkeys.userId, user.id))
    : [];
  if (!user || !keys.length) return NextResponse.json({ status: "continue" });
  const rpID =
    process.env.NODE_ENV === "production" ? "app.cubiqlo.com" : "localhost";
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: "required",
    allowCredentials: keys.map((k) => ({
      id: k.credentialID,
      transports: k.transports?.split(",") as never,
    })),
  });
  await db
    .insert(authRecoveryHandoffs)
    .values({
      userId: user.id,
      tokenHash: hashVerifier(`passkey-challenge:${options.challenge}`, secret),
      method: "passkey",
      expiresAt: new Date(Date.now() + 5 * 60_000),
    });
  const response = NextResponse.json({ status: "passkey_required", options });
  response.cookies.set(COOKIE, options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  return response;
}
