import { z } from "zod";
import { verifyPassword } from "@better-auth/utils/password";
import { generateOtp, generateToken, hashVerifier, maskEmail, OTP_EXPIRY_MS, TRUSTED_DEVICE_EXPIRY_MS, verifyVerifier } from "./crypto";

export const loginInput = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200), callbackUrl: z.unknown().optional(), trustedCookie: z.string().optional() });
export const INVALID_CREDENTIALS = "Email atau password salah";
export const LOGIN_FLOW_EXPIRY_MS = OTP_EXPIRY_MS;

export function normalizeLoginEmail(email: string) { return email.trim().toLowerCase(); }
export function validateLoginInput(input: unknown) { const parsed = loginInput.safeParse(input); return parsed.success ? { ok: true as const, value: { ...parsed.data, email: normalizeLoginEmail(parsed.data.email) } } : { ok: false as const }; }
export function sanitizeCallbackUrl(value: unknown) { return typeof value === "string" && value.startsWith("/app") && !value.startsWith("//") ? value : "/app/dashboard"; }
export function parseTrustedCookie(value?: string) { if (!value) return null; const dot = value.indexOf("."); const id = value.slice(0, dot); const token = value.slice(dot + 1); return /^[0-9a-f-]{36}$/i.test(id) && token.length >= 8 ? { id, token } : null; }
export function isValidTrustedDevice(input: { userId: string; deviceUserId: string; tokenValid: boolean; expiresAt: Date; revokedAt: Date | null }, now = new Date()) { return input.userId === input.deviceUserId && input.tokenValid && !input.revokedAt && input.expiresAt > now; }
export function createOtpChallenge(secret: string, now = new Date()) { const code = generateOtp(); return { code, codeHash: hashVerifier(code, secret), expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), resendAfter: new Date(now.getTime() + 60_000) }; }
export function createTrustedDevice(secret: string, now = new Date()) { const token = generateToken(); return { token, tokenHash: hashVerifier(token, secret), expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_EXPIRY_MS) }; }

export type Credential = { userId: string; email: string; passwordHash: string };
export type TrustedDevice = { userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null };
export type PasswordLoginDeps = {
  enabled: boolean; secret: string; now: () => Date;
  rateLimit(email: string): Promise<boolean>;
  findCredential(email: string): Promise<Credential | null>;
  verifyPassword(hash: string, password: string): Promise<boolean>;
  verifyDummyPassword(password: string): Promise<void>;
  findTrustedDevice(id: string): Promise<TrustedDevice | null>;
  createSession(userId: string): Promise<void>;
  replaceChallenge(value: { userId: string; flowId: string; codeHash: string; expiresAt: Date; resendAfter: Date }): Promise<void>;
  deleteChallenge(flowId: string): Promise<void>;
  sendOtp(value: { email: string; code: string; expiresAt: Date }): Promise<void>;
};
export type PasswordLoginInput = { email: string; password: string; callbackUrl?: unknown; trustedCookie?: string };

export async function runPasswordLoginStart(input: PasswordLoginInput, deps: PasswordLoginDeps) {
  if (!deps.enabled) return { ok: false as const, code: "DISABLED", error: "Login OTP belum aktif" };
  const parsed = validateLoginInput(input);
  if (!parsed.ok) return { ok: false as const, code: "INVALID_REQUEST", error: "Permintaan tidak valid" };
  const email = parsed.value.email;
  if (!await deps.rateLimit(email)) return { ok: false as const, code: "RATE_LIMITED", error: "Terlalu banyak percobaan. Coba lagi nanti." };
  const credential = await deps.findCredential(email);
  if (!credential) {
    await deps.verifyDummyPassword(input.password);
    return { ok: false as const, code: "INVALID_CREDENTIALS", error: INVALID_CREDENTIALS };
  }
  if (!await deps.verifyPassword(credential.passwordHash, input.password)) return { ok: false as const, code: "INVALID_CREDENTIALS", error: INVALID_CREDENTIALS };

  const cookie = parseTrustedCookie(input.trustedCookie);
  const device = cookie ? await deps.findTrustedDevice(cookie.id) : null;
  if (cookie && device && isValidTrustedDevice({ userId: credential.userId, deviceUserId: device.userId, tokenValid: verifyVerifier(cookie.token, device.tokenHash, deps.secret), expiresAt: device.expiresAt, revokedAt: device.revokedAt }, deps.now())) {
    await deps.createSession(credential.userId);
    return { ok: true as const, status: "authenticated" as const, redirectTo: sanitizeCallbackUrl(input.callbackUrl) };
  }

  const flowId = generateToken();
  const challenge = createOtpChallenge(deps.secret, deps.now());
  await deps.replaceChallenge({ userId: credential.userId, flowId, codeHash: challenge.codeHash, expiresAt: challenge.expiresAt, resendAfter: challenge.resendAfter });
  try { await deps.sendOtp({ email: credential.email, code: challenge.code, expiresAt: challenge.expiresAt }); }
  catch { await deps.deleteChallenge(flowId); return { ok: false as const, code: "DELIVERY_FAILED", error: "Kode OTP gagal dikirim. Coba lagi." }; }
  return { ok: true as const, status: "otp_required" as const, maskedEmail: maskEmail(credential.email), expiresAt: challenge.expiresAt.toISOString(), flowId };
}

export { verifyPassword };
