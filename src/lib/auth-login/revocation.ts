export type RevocationDeps = {
  revokeSessions(userId: string, sessionId?: string): Promise<void> | void;
  revokeTrustedDevices(userId: string, deviceId?: string): Promise<void> | void;
  consumeChallenges(userId: string): Promise<void> | void;
  revokeRecovery(userId: string): Promise<void> | void;
};
export async function revokeCurrentAuthState(
  userId: string,
  sessionId: string,
  deviceId: string | undefined,
  deps: RevocationDeps,
) {
  await Promise.all([
    deps.revokeSessions(userId, sessionId),
    deps.revokeTrustedDevices(userId, deviceId),
  ]);
}
export async function revokeAllAuthState(userId: string, deps: RevocationDeps) {
  await Promise.all([
    deps.revokeSessions(userId),
    deps.revokeTrustedDevices(userId),
    deps.consumeChallenges(userId),
    deps.revokeRecovery(userId),
  ]);
}
