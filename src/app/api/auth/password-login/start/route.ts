import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { makeSignature } from "better-auth/crypto";
import { getCookies } from "better-auth/cookies";
import { verifyPassword } from "@better-auth/utils/password";
import { db } from "@/db";
import { accounts, authLoginOtpChallenges, authTrustedDevices, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import { enforceRateLimit, getTrustedClientIp } from "@/lib/distributed-rate-limit";
import { sendLoginOtpEmail } from "@/lib/auth-login/email";
import { runPasswordLoginStart, validateLoginInput } from "@/lib/auth-login/service";

const FLOW_COOKIE = "cubiqlo.login_flow";
const TRUSTED_COOKIE = "cubiqlo.trusted_device";
const DUMMY_HASH = "b62b26ed4284315cf2563e38a87bc27f:1eeceaa3cc52ace8bcdb4eeb2661639b6d2de33932fe89efa7577960df34f8d8f8038224acfa30fa0f6f707818c3cb842ee628a8f670ddb71d60717ba3ab04ca";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 }); }
  const parsed = validateLoginInput(body);
  if (!parsed.ok) return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Layanan login tidak tersedia" }, { status: 503 });
  const ip = getTrustedClientIp(request);
  const trustedCookie = request.headers.get("cookie")?.match(/(?:^|; )cubiqlo\.trusted_device=([^;]+)/)?.[1];
  const result = await runPasswordLoginStart({ ...parsed.value, trustedCookie }, {
    enabled: process.env.PASSWORD_EMAIL_OTP_LOGIN_ENABLED === "true",
    secret,
    now: () => new Date(),
    rateLimit: async (email) => {
      const [byEmail, byIp] = await Promise.all([
        enforceRateLimit(request, "password-login-email", { limit: 5, windowSec: 300 }, { identity: email, failureMode: "closed" }),
        enforceRateLimit(request, "password-login-ip", { limit: 15, windowSec: 300 }, { identity: ip, failureMode: "closed" }),
      ]);
      return byEmail.allowed && byIp.allowed;
    },
    findCredential: async (email) => {
      const [row] = await db.select({ userId: users.id, email: users.email, passwordHash: accounts.password }).from(users).innerJoin(accounts, and(eq(accounts.userId, users.id), eq(accounts.providerId, "credential"))).where(eq(users.email, email)).limit(1);
      return row?.passwordHash ? { userId: row.userId, email: row.email, passwordHash: row.passwordHash } : null;
    },
    verifyPassword,
    verifyDummyPassword: async (password) => { await verifyPassword(DUMMY_HASH, password); },
    findTrustedDevice: async (id) => (await db.select().from(authTrustedDevices).where(eq(authTrustedDevices.id, id)).limit(1))[0] ?? null,
    createSession: async (userId) => {
      const context = await auth.$context;
      const session = await context.internalAdapter.createSession(userId);
      if (!session) throw new Error("Session creation failed");
      const cookie = getCookies(auth.options).sessionToken;
      const signature = await makeSignature(session.token, secret);
      (request as Request & { _sessionCookie?: { name: string; value: string; attributes: typeof cookie.attributes } })._sessionCookie = { name: cookie.name, value: `${session.token}.${signature}`, attributes: cookie.attributes };
    },
    replaceChallenge: async (challenge) => { await db.transaction(async (tx) => { await tx.delete(authLoginOtpChallenges).where(and(eq(authLoginOtpChallenges.userId, challenge.userId), eq(authLoginOtpChallenges.flowId, challenge.flowId))); await tx.insert(authLoginOtpChallenges).values({ ...challenge, purpose: "login" }); }); },
    deleteChallenge: async (flowId) => { await db.delete(authLoginOtpChallenges).where(eq(authLoginOtpChallenges.flowId, flowId)); },
    sendOtp: sendLoginOtpEmail,
  });
  const status = result.ok ? 200 : result.code === "RATE_LIMITED" ? 429 : result.code === "DISABLED" ? 404 : result.code === "INVALID_CREDENTIALS" ? 401 : 503;
  const { flowId, ...publicResult } = result.ok && result.status === "otp_required" ? result : { ...result, flowId: undefined };
  const response = NextResponse.json(publicResult, { status });
  if (flowId) response.cookies.set(FLOW_COOKIE, flowId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600 });
  const sessionCookie = (request as Request & { _sessionCookie?: { name: string; value: string; attributes: Record<string, unknown> } })._sessionCookie;
  if (sessionCookie) response.cookies.set(sessionCookie.name, sessionCookie.value, sessionCookie.attributes);
  return response;
}

export async function GET() { return NextResponse.json({ error: "Method not allowed" }, { status: 405 }); }
export { FLOW_COOKIE, TRUSTED_COOKIE };
