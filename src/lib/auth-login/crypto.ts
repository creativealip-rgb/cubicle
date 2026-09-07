import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const OTP_EXPIRY_MS = 10 * 60_000;
export const TRUSTED_DEVICE_EXPIRY_MS = 30 * 24 * 60 * 60_000;

export function generateOtp(): string { return randomInt(0, 1_000_000).toString().padStart(6, "0"); }
export function generateToken(): string { return randomBytes(32).toString("base64url"); }
export function hashVerifier(value: string, secret: string): string { return createHmac("sha256", secret).update(`cubiqlo:auth-login:${value}`).digest("hex"); }
export function verifyVerifier(value: string, expected: string, secret: string): boolean {
  const actual = Buffer.from(hashVerifier(value, secret), "hex"); const given = Buffer.from(expected, "hex");
  return actual.length === given.length && timingSafeEqual(actual, given);
}
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@", 2); if (!domain) return "***";
  return `${local.length <= 2 ? `${local[0] ?? "*"}***` : `${local[0]}***${local.at(-1)}` }@${domain}`;
}
export function sha256(value: string): string { return createHash("sha256").update(value).digest("hex"); }
