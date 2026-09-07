import { NextResponse } from "next/server";
import { and, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { authLoginOtpChallenges, authTrustedDevices } from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { createTrustedDevice } from "@/lib/auth-login/service";
import { createBetterAuthSession } from "@/lib/auth-login/session";
import { runOtpVerify } from "@/lib/auth-login/verify";

const FLOW_COOKIE = "cubiqlo.login_flow";
const TRUSTED_COOKIE = "cubiqlo.trusted_device";

export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (process.env.PASSWORD_EMAIL_OTP_LOGIN_ENABLED !== "true") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!secret) return NextResponse.json({ error: "Layanan login tidak tersedia" }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 }); }
  const code = typeof body === "object" && body && "code" in body ? String((body as { code: unknown }).code) : "";
  const flowId = request.headers.get("cookie")?.match(/(?:^|; )cubiqlo\.login_flow=([^;]+)/)?.[1] ?? "";
  const sessionCookie: { current: Awaited<ReturnType<typeof createBetterAuthSession>> | null } = { current: null };
  const result = await runOtpVerify(flowId, code, {
    secret,
    now: () => new Date(),
    rateLimit: async (flow) => (await enforceRateLimit(request, "password-login-verify", { limit: 5, windowSec: 600 }, { identity: flow || "missing", failureMode: "closed" })).allowed,
    lockChallenge: async (flow) => (await db.select().from(authLoginOtpChallenges).where(eq(authLoginOtpChallenges.flowId, flow)).limit(1))[0] ?? null,
    failAttempt: async (id) => { await db.update(authLoginOtpChallenges).set({ attempts: sql`${authLoginOtpChallenges.attempts} + 1` }).where(and(eq(authLoginOtpChallenges.id, id), isNull(authLoginOtpChallenges.consumedAt), lt(authLoginOtpChallenges.attempts, 5))); },
    consume: async (id) => Boolean((await db.update(authLoginOtpChallenges).set({ consumedAt: new Date() }).where(and(eq(authLoginOtpChallenges.id, id), isNull(authLoginOtpChallenges.consumedAt), lt(authLoginOtpChallenges.attempts, 5))).returning({ id: authLoginOtpChallenges.id })).length),
    createSession: async (userId) => { sessionCookie.current = await createBetterAuthSession(userId, secret); },
    createTrustedDevice: async (userId) => {
      const trusted = createTrustedDevice(secret);
      const [row] = await db.insert(authTrustedDevices).values({ userId, tokenHash: trusted.tokenHash, expiresAt: trusted.expiresAt, lastSeenIp: request.headers.get("cf-connecting-ip"), lastSeenUserAgent: request.headers.get("user-agent") }).returning({ id: authTrustedDevices.id });
      if (!row) throw new Error("Trusted device creation failed");
      return { id: row.id, token: trusted.token };
    },
  });
  const response = NextResponse.json(result.ok ? { status: result.status, redirectTo: "/app/dashboard" } : result, { status: result.ok ? 200 : result.code === "RATE_LIMITED" ? 429 : 401 });
  if (result.ok && sessionCookie.current) {
    response.cookies.set(sessionCookie.current.name, sessionCookie.current.value, sessionCookie.current.attributes);
    response.cookies.set(TRUSTED_COOKIE, result.trustedCookie, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
    response.cookies.set(FLOW_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  }
  return response;
}
