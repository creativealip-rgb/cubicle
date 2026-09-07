import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import {
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "@/db";
import {
  authRecoveryAuthorizations,
  authRecoveryHandoffs,
  authTrustedDevices,
  passkeys,
} from "@/db/schema";
import { hashVerifier } from "@/lib/auth-login/crypto";
import { revokeAllUserAuthState } from "@/lib/auth-login/revoke-db";
import { createBetterAuthSession } from "@/lib/auth-login/session";
import { createTrustedDevice } from "@/lib/auth-login/service";
const COOKIE = "cubiqlo.recovery_passkey";
export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Recovery unavailable" },
      { status: 503 },
    );
  const challenge = request.headers
    .get("cookie")
    ?.match(/(?:^|; )cubiqlo\.recovery_passkey=([^;]+)/)?.[1];
  const body = (await request
    .json()
    .catch(() => null)) as AuthenticationResponseJSON | null;
  if (!challenge || !body?.id)
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 401 },
    );
  const hash = hashVerifier(`passkey-challenge:${challenge}`, secret);
  const [handoff] = await db
    .select()
    .from(authRecoveryHandoffs)
    .where(
      and(
        eq(authRecoveryHandoffs.tokenHash, hash),
        eq(authRecoveryHandoffs.method, "passkey"),
        isNull(authRecoveryHandoffs.consumedAt),
        gt(authRecoveryHandoffs.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!handoff)
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 401 },
    );
  const [key] = await db
    .select()
    .from(passkeys)
    .where(
      and(
        eq(passkeys.userId, handoff.userId),
        eq(passkeys.credentialID, body.id),
      ),
    )
    .limit(1);
  if (!key)
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 401 },
    );
  try {
    const result = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin:
        process.env.NODE_ENV === "production"
          ? "https://app.cubiqlo.com"
          : "http://localhost:3000",
      expectedRPID:
        process.env.NODE_ENV === "production" ? "app.cubiqlo.com" : "localhost",
      credential: {
        id: key.credentialID,
        publicKey: Buffer.from(key.publicKey, "base64url"),
        counter: key.counter,
        transports: key.transports?.split(",") as never,
      },
      requireUserVerification: true,
    });
    if (!result.verified) throw new Error();
    const consumed = await db
      .update(authRecoveryHandoffs)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authRecoveryHandoffs.id, handoff.id),
          isNull(authRecoveryHandoffs.consumedAt),
        ),
      )
      .returning({ id: authRecoveryHandoffs.id });
    if (!consumed.length)
      return NextResponse.json(
        { error: "Passkey challenge already used" },
        { status: 409 },
      );
    await db
      .update(passkeys)
      .set({
        counter: result.authenticationInfo.newCounter,
        deviceType: result.authenticationInfo.credentialDeviceType,
        backedUp: result.authenticationInfo.credentialBackedUp,
      })
      .where(eq(passkeys.id, key.id));
    await revokeAllUserAuthState(handoff.userId);
    const session = await createBetterAuthSession(handoff.userId, secret);
    const trusted = createTrustedDevice(secret);
    const [device] = await db
      .insert(authTrustedDevices)
      .values({
        userId: handoff.userId,
        tokenHash: trusted.tokenHash,
        expiresAt: trusted.expiresAt,
        lastSeenIp: request.headers.get("cf-connecting-ip"),
        lastSeenUserAgent: request.headers.get("user-agent"),
      })
      .returning({ id: authTrustedDevices.id });
    await db
      .insert(authRecoveryAuthorizations)
      .values({
        userId: handoff.userId,
        sessionId: session.sessionId,
        scope: "account_recovery",
        expiresAt: new Date(Date.now() + 30 * 60_000),
      });
    const response = NextResponse.json({
      status: "recovered",
      redirectTo: "/app/settings?tab=account&recovered=1",
    });
    response.cookies.set(session.name, session.value, session.attributes);
    response.cookies.set(
      "cubiqlo.trusted_device",
      `${device.id}.${trusted.token}`,
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 86400,
      },
    );
    response.cookies.set(COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "Passkey verification failed" },
      { status: 401 },
    );
  }
}
