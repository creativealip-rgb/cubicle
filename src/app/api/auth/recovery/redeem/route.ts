import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  authRecoveryAuthorizations,
  authRecoveryHandoffs,
  authTrustedDevices,
} from "@/db/schema";
import { createTrustedDevice } from "@/lib/auth-login/service";
import { createBetterAuthSession } from "@/lib/auth-login/session";
import { revokeAllUserAuthState } from "@/lib/auth-login/revoke-db";
import { hashVerifier } from "@/lib/auth-login/crypto";

export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Recovery unavailable" },
      { status: 503 },
    );
  const token = String(
    ((await request.json().catch(() => ({}))) as { token?: unknown }).token ??
      "",
  );
  if (token.length < 32)
    return NextResponse.json(
      { error: "Recovery link invalid" },
      { status: 401 },
    );
  const tokenHash = hashVerifier(`recovery-handoff:${token}`, secret);
  const [handoff] = await db
    .select()
    .from(authRecoveryHandoffs)
    .where(
      and(
        eq(authRecoveryHandoffs.tokenHash, tokenHash),
        isNull(authRecoveryHandoffs.consumedAt),
        gt(authRecoveryHandoffs.expiresAt, new Date()),
      ),
    )
    .limit(1);
  if (!handoff)
    return NextResponse.json(
      { error: "Recovery link invalid or expired" },
      { status: 401 },
    );
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
      { error: "Recovery link already used" },
      { status: 409 },
    );
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
  return response;
}
