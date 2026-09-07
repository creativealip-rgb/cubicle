import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  authRecoveryAuthorizations,
  authTrustedDevices,
  twoFactors,
  users,
} from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { consumeBackupCode } from "@/lib/auth-recovery/backup-code";
import { revokeAllUserAuthState } from "@/lib/auth-login/revoke-db";
import { createBetterAuthSession } from "@/lib/auth-login/session";
import { createTrustedDevice } from "@/lib/auth-login/service";
export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret)
    return NextResponse.json(
      { error: "Recovery unavailable" },
      { status: 503 },
    );
  const body = (await request.json().catch(() => ({}))) as {
    email?: unknown;
    code?: unknown;
  };
  const email = String(body.email ?? "")
      .trim()
      .toLowerCase(),
    code = String(body.code ?? "").trim();
  const limited = await enforceRateLimit(
    request,
    "backup-code-recovery",
    { limit: 5, windowSec: 900 },
    { identity: email || "missing", failureMode: "closed" },
  );
  if (!limited.allowed)
    return NextResponse.json(
      { error: "Unable to recover account" },
      { status: 429 },
    );
  const userId = await db.transaction(async (tx) => {
    const [row] = await tx
      .select({
        id: twoFactors.id,
        userId: twoFactors.userId,
        backupCodes: twoFactors.backupCodes,
      })
      .from(twoFactors)
      .innerJoin(users, eq(users.id, twoFactors.userId))
      .where(and(eq(users.email, email), eq(twoFactors.verified, true)))
      .for("update")
      .limit(1);
    if (!row) return null;
    const result = consumeBackupCode(row.backupCodes, code);
    if (!result.ok) return null;
    await tx
      .update(twoFactors)
      .set({ backupCodes: result.encoded })
      .where(eq(twoFactors.id, row.id));
    return row.userId;
  });
  if (!userId)
    return NextResponse.json(
      { error: "Unable to recover account" },
      { status: 401 },
    );
  await revokeAllUserAuthState(userId);
  const session = await createBetterAuthSession(userId, secret);
  const trusted = createTrustedDevice(secret);
  const [device] = await db
    .insert(authTrustedDevices)
    .values({
      userId,
      tokenHash: trusted.tokenHash,
      expiresAt: trusted.expiresAt,
      lastSeenIp: request.headers.get("cf-connecting-ip"),
      lastSeenUserAgent: request.headers.get("user-agent"),
    })
    .returning({ id: authTrustedDevices.id });
  await db
    .insert(authRecoveryAuthorizations)
    .values({
      userId,
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
