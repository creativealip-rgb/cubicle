import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  authLoginOtpChallenges,
  authRecoveryAuthorizations,
  authTrustedDevices,
  sessions,
} from "@/db/schema";
import { revokeAllAuthState, revokeCurrentAuthState } from "./revocation";

const deps = {
  revokeSessions: async (userId: string, sessionId?: string) => {
    await db
      .delete(sessions)
      .where(
        sessionId
          ? and(eq(sessions.userId, userId), eq(sessions.id, sessionId))
          : eq(sessions.userId, userId),
      );
  },
  revokeTrustedDevices: async (userId: string, deviceId?: string) => {
    await db
      .update(authTrustedDevices)
      .set({ revokedAt: new Date() })
      .where(
        deviceId
          ? and(
              eq(authTrustedDevices.userId, userId),
              eq(authTrustedDevices.id, deviceId),
            )
          : eq(authTrustedDevices.userId, userId),
      );
  },
  consumeChallenges: async (userId: string) => {
    await db
      .update(authLoginOtpChallenges)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authLoginOtpChallenges.userId, userId),
          isNull(authLoginOtpChallenges.consumedAt),
        ),
      );
  },
  revokeRecovery: async (userId: string) => {
    await db
      .update(authRecoveryAuthorizations)
      .set({ consumedAt: new Date() })
      .where(
        and(
          eq(authRecoveryAuthorizations.userId, userId),
          isNull(authRecoveryAuthorizations.consumedAt),
        ),
      );
  },
};
export const revokeCurrentUserAuthState = (
  userId: string,
  sessionId: string,
  deviceId?: string,
) => revokeCurrentAuthState(userId, sessionId, deviceId, deps);
export const revokeAllUserAuthState = (userId: string) =>
  revokeAllAuthState(userId, deps);
