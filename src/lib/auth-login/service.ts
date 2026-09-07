import { z } from "zod";
import { verifyPassword } from "@better-auth/utils/password";
import { generateOtp, generateToken, hashVerifier, OTP_EXPIRY_MS, TRUSTED_DEVICE_EXPIRY_MS } from "./crypto";

export const loginInput = z.object({ email: z.string().trim().email(), password: z.string().min(1).max(200) });
export const INVALID_CREDENTIALS = "Email atau password salah";
export function normalizeLoginEmail(email: string) { return email.trim().toLowerCase(); }
export function validateLoginInput(input: unknown) { const parsed = loginInput.safeParse(input); return parsed.success ? { ok: true as const, value: { ...parsed.data, email: normalizeLoginEmail(parsed.data.email) } } : { ok: false as const }; }
export function isValidTrustedDevice(input: { userId: string; deviceUserId: string; tokenValid: boolean; expiresAt: Date; revokedAt: Date | null }, now = new Date()) { return input.userId === input.deviceUserId && input.tokenValid && !input.revokedAt && input.expiresAt > now; }
export function createOtpChallenge(secret: string, now = new Date()) { const code = generateOtp(); return { code, codeHash: hashVerifier(code, secret), expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS), resendAfter: new Date(now.getTime() + 60_000) }; }
export function createTrustedDevice(secret: string, now = new Date()) { const token = generateToken(); return { token, tokenHash: hashVerifier(token, secret), expiresAt: new Date(now.getTime() + TRUSTED_DEVICE_EXPIRY_MS) }; }
export function sanitizeCallbackUrl(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\\\")) return "/app";
  try { const url = new URL(value, "https://local.invalid"); return url.origin === "https://local.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/app"; } catch { return "/app"; }
}

export function parseOpaqueTrustedCookie(value: string | undefined): { recordId: string; token: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot < 1 || dot === value.length - 1 || value.indexOf(".", dot + 1) !== -1) return null;
  return { recordId: value.slice(0, dot), token: value.slice(dot + 1) };
}

export function isTrustedCookie(input: { userId: string; deviceUserId: string; tokenValid: boolean; expiresAt: Date; revokedAt: Date | null }, now = new Date()) {
  return isValidTrustedDevice(input, now);
}

export { verifyPassword };
