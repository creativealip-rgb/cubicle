"use server";

import { headers } from "next/headers";
import { count, eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { passkeys, users } from "@/db/schema";
import { canCompletePasskeyEnrollment } from "@/lib/mfa/enrollment";

export async function completePasskeyMfaEnrollment() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return { error: "Unauthorized" } as const;
  const [row] = await db
    .select({ value: count() })
    .from(passkeys)
    .where(eq(passkeys.userId, session.user.id));
  if (!canCompletePasskeyEnrollment(true, row?.value ?? 0))
    return { error: "Passkey registration was not completed" } as const;
  await db
    .update(users)
    .set({ twoFactorEnabled: true, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));
  return { ok: true } as const;
}
