import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedPortalPassword = { ciphertext: string; nonce: string; version: number };
const VERSION = 1;

function parseKey(value: string): Buffer {
  if (!value || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error("PORTAL_PASSWORD_ENCRYPTION_KEY harus base64 32-byte");
  const key = Buffer.from(value, "base64");
  if (key.length !== 32 || key.toString("base64") !== value) throw new Error("PORTAL_PASSWORD_ENCRYPTION_KEY harus base64 32-byte");
  return key;
}

export function encryptPortalPassword(plaintext: string, key: string): EncryptedPortalPassword {
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", parseKey(key), nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const payload = Buffer.concat([encrypted, cipher.getAuthTag()]);
  return { ciphertext: payload.toString("base64"), nonce: nonce.toString("base64"), version: VERSION };
}

export function decryptPortalPassword(value: EncryptedPortalPassword, key: string): string {
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
