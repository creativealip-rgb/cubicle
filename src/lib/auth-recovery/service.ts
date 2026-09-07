import { verifyVerifier } from "@/lib/auth-login/crypto";
export type Handoff = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
};
export type RecoveryDeps = {
  now(): Date;
  secret: string;
  findHandoff(token: string): Promise<Handoff | null>;
  consume(id: string): Promise<boolean>;
  revokeOldAuth(userId: string): Promise<void>;
  createSession(userId: string): Promise<string>;
  createTrustedDevice(userId: string): Promise<string>;
  createAuthorization(userId: string, sessionId: string): Promise<void>;
};
export async function redeemRecoveryHandoff(token: string, d: RecoveryDeps) {
  const row = await d.findHandoff(token);
  if (
    !row ||
    row.consumedAt ||
    row.expiresAt <= d.now() ||
    !verifyVerifier(`recovery-handoff:${token}`, row.tokenHash, d.secret)
  )
    return { ok: false } as const;
  if (!(await d.consume(row.id))) return { ok: false } as const;
  await d.revokeOldAuth(row.userId);
  const sessionId = await d.createSession(row.userId);
  const trustedCookie = await d.createTrustedDevice(row.userId);
  await d.createAuthorization(row.userId, sessionId);
  return { ok: true, sessionId, trustedCookie } as const;
}
