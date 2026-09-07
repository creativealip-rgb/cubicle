import { verifyVerifier } from "./crypto";

export type OtpChallenge = { id: string; userId: string; codeHash: string; attempts: number; expiresAt: Date; consumedAt: Date | null };
export type OtpVerifyDeps = {
  secret: string; now: () => Date; rateLimit(flowId: string): Promise<boolean>;
  lockChallenge(flowId: string): Promise<OtpChallenge | null>; failAttempt(id: string): Promise<void>;
  consume(id: string): Promise<boolean>; createSession(userId: string): Promise<void>;
  createTrustedDevice(userId: string): Promise<{ id: string; token: string }>;
};
const invalid = { ok: false as const, code: "INVALID_OTP", error: "Kode OTP tidak valid atau kedaluwarsa" };
export async function runOtpVerify(flowId: string, code: string, deps: OtpVerifyDeps) {
  if (!flowId || !/^\d{6}$/.test(code)) return invalid;
  if (!await deps.rateLimit(flowId)) return { ok: false as const, code: "RATE_LIMITED", error: "Terlalu banyak percobaan. Coba lagi nanti." };
  const challenge = await deps.lockChallenge(flowId);
  const now = deps.now();
  if (!challenge || challenge.consumedAt || challenge.expiresAt <= now || challenge.attempts >= 5) return invalid;
  if (!verifyVerifier(code, challenge.codeHash, deps.secret)) { await deps.failAttempt(challenge.id); return invalid; }
  if (!await deps.consume(challenge.id)) return invalid;
  await deps.createSession(challenge.userId);
  const trusted = await deps.createTrustedDevice(challenge.userId);
  return { ok: true as const, status: "authenticated" as const, trustedCookie: `${trusted.id}.${trusted.token}` };
}
