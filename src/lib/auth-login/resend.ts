export type ResendChallenge = { id: string; email: string; resendAfter: Date; consumedAt: Date | null };
export type OtpResendDeps = {
  now(): Date; rateLimit(flowId: string): Promise<boolean>; findChallenge(flowId: string): Promise<ResendChallenge | null>;
  replaceCode(id: string): Promise<{ code: string; expiresAt: Date }>; sendOtp(value: { email: string; code: string; expiresAt: Date }): Promise<void>; rollback(id: string): Promise<void>;
};
export async function runOtpResend(flowId: string, deps: OtpResendDeps) {
  if (!flowId || !await deps.rateLimit(flowId)) return { ok: false as const, code: "RATE_LIMITED", error: "Terlalu banyak permintaan" };
  const challenge = await deps.findChallenge(flowId);
  if (!challenge || challenge.consumedAt) return { ok: false as const, code: "INVALID_FLOW", error: "Sesi login tidak valid" };
  if (challenge.resendAfter > deps.now()) return { ok: false as const, code: "COOLDOWN", error: "Tunggu sebelum mengirim ulang kode" };
  const next = await deps.replaceCode(challenge.id);
  try { await deps.sendOtp({ email: challenge.email, ...next }); }
  catch { await deps.rollback(challenge.id); return { ok: false as const, code: "DELIVERY_FAILED", error: "Kode OTP gagal dikirim" }; }
  return { ok: true as const, expiresAt: next.expiresAt.toISOString() };
}
