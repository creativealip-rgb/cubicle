import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
const normalize = (value: string) => value.trim().toUpperCase();
const hash = (code: string, secret: string) =>
  createHmac("sha256", secret)
    .update(`backup-code:${normalize(code)}`)
    .digest("hex");
export function createBackupCodes(secret: string) {
  if (!secret) throw new Error("Backup-code secret required");
  return Array.from({ length: 10 }, () => {
    const raw = randomBytes(5).toString("hex").toUpperCase();
    const code = `${raw.slice(0, 5)}-${raw.slice(5)}`;
    return { code, hash: hash(code, secret) };
  });
}
export function verifyBackupCode(
  expected: string,
  code: string,
  secret: string,
) {
  if (
    !secret ||
    !/^[A-F0-9]{5}-[A-F0-9]{5}$/i.test(code.trim()) ||
    !/^[a-f0-9]{64}$/i.test(expected)
  )
    return false;
  const actual = hash(code, secret);
  return timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(actual, "hex"),
  );
}
