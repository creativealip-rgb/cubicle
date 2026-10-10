import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedPortalPassword = { ciphertext: string; nonce: string; version: number };
const VERSION = 1;

function parseKey(value?: string): Buffer {
  // An explicitly supplied key is the caller's contract: it must be a canonical
  // 32-byte base64 key. Never derive a usable key from material the caller
  // believed was rejected — silently falling back would encrypt under a
  // different key than production, losing the very secret we are protecting.
  if (value) {
    if (/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
      const key = Buffer.from(value, "base64");
      if (key.length === 32 && key.toString("base64") === value) return key;
    }
    throw new Error("PORTAL_PASSWORD_ENCRYPTION_KEY tidak valid: harus 32 byte base64");
  }
  // No key supplied: in production the callers (src/lib/actions/clients.ts) pass
  // it explicitly and throw when missing. Off-call-site usages (cron, scripts)
  // derive deterministically from the environment; a real env secret must exist,
  // because a built-in seed would be a public, forgeable encryption key.
  const fallback =
    process.env.PORTAL_PASSWORD_ENCRYPTION_KEY?.trim() ||
    process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim() ||
    process.env.BETTER_AUTH_SECRET?.trim();
  if (!fallback) {
    throw new Error(
      "PORTAL_PASSWORD_ENCRYPTION_KEY belum dikonfigurasi: tidak ada kunci enkripsi Portal",
    );
  }
  const { createHash } = require("node:crypto");
  return createHash("sha256").update(fallback).digest();
}

export function encryptPortalPassword(plaintext: string, key?: string): EncryptedPortalPassword {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", parseKey(key), nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return { ciphertext: payload.toString("base64"), nonce: nonce.toString("base64"), version: VERSION };
}

export function decryptPortalPassword(value: EncryptedPortalPassword, key?: string): string {
  if (value.version !== VERSION) throw new Error("Versi enkripsi Portal tidak didukung");
  const nonce = Buffer.from(value.nonce, "base64");
  const payload = Buffer.from(value.ciphertext, "base64");
  if (nonce.length !== 12 || payload.length < 17) throw new Error("Data enkripsi Portal tidak valid");
  const ciphertext = payload.subarray(0, -16);
  const tag = payload.subarray(-16);
  const decipher = createDecipheriv("aes-256-gcm", parseKey(key), nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
