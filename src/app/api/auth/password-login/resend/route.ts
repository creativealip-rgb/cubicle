import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { authLoginOtpChallenges, users } from "@/db/schema";
import { enforceRateLimit } from "@/lib/distributed-rate-limit";
import { createOtpChallenge } from "@/lib/auth-login/service";
import { sendLoginOtpEmail } from "@/lib/auth-login/email";
import { runOtpResend } from "@/lib/auth-login/resend";

export async function POST(request: Request) {
  const secret = process.env.BETTER_AUTH_SECRET;
  const flowId = request.headers.get("cookie")?.match(/(?:^|; )cubiqlo\.login_flow=([^;]+)/)?.[1] ?? "";
  if (process.env.PASSWORD_EMAIL_OTP_LOGIN_ENABLED !== "true") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!secret) return NextResponse.json({ error: "Layanan login tidak tersedia" }, { status: 503 });
  const result = await runOtpResend(flowId, {
    now: () => new Date(),
    rateLimit: async (flow) => (await enforceRateLimit(request, "password-login-resend", { limit: 3, windowSec: 600 }, { identity: flow || "missing", failureMode: "closed" })).allowed,
    findChallenge: async (flow) => {
      const [row] = await db.select({ id: authLoginOtpChallenges.id, email: users.email, resendAfter: authLoginOtpChallenges.resendAfter, consumedAt: authLoginOtpChallenges.consumedAt }).from(authLoginOtpChallenges).innerJoin(users, eq(users.id, authLoginOtpChallenges.userId)).where(eq(authLoginOtpChallenges.flowId, flow)).limit(1);
      return row ?? null;
    },
    replaceCode: async (id) => {
      const next = createOtpChallenge(secret);
      await db.update(authLoginOtpChallenges).set({ codeHash: next.codeHash, attempts: 0, expiresAt: next.expiresAt, resendAfter: next.resendAfter, consumedAt: null }).where(eq(authLoginOtpChallenges.id, id));
      return { code: next.code, expiresAt: next.expiresAt };
    },
    sendOtp: sendLoginOtpEmail,
    rollback: async (id) => { await db.update(authLoginOtpChallenges).set({ consumedAt: sql`now()` }).where(eq(authLoginOtpChallenges.id, id)); },
  });
  return NextResponse.json(result, { status: result.ok ? 200 : result.code === "RATE_LIMITED" ? 429 : result.code === "COOLDOWN" ? 409 : 400 });
}
