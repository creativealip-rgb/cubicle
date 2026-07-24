"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";

export type AccountActionResult = {
  ok: boolean;
  error?: string;
};

export async function updateAccountName(name: string): Promise<AccountActionResult> {
  const session = await requireAppSession("/app/settings?tab=account");
  const nextName = name.trim();

  if (nextName.length < 2) {
    return { ok: false, error: "Nama minimal 2 karakter." };
  }

  if (nextName.length > 80) {
    return { ok: false, error: "Nama maksimal 80 karakter." };
  }

  await db
    .update(users)
    .set({ name: nextName, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  revalidatePath("/app/settings");
  revalidatePath("/app/dashboard");
  return { ok: true };
}

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountActionResult> {
  const session = await requireAppSession("/app/settings?tab=account");
  const current = currentPassword.trim();
  const next = newPassword.trim();

  if (current.length === 0) {
    return { ok: false, error: "Password sekarang wajib diisi." };
  }

  if (next.length < 8) {
    return { ok: false, error: "Password baru minimal 8 karakter." };
  }

  if (current === next) {
    return { ok: false, error: "Password baru harus berbeda." };
  }

  const [credential] = await db
    .select({ id: accounts.id, password: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")))
    .limit(1);

  if (!credential?.password) {
    return { ok: false, error: "Akun ini belum punya password credential." };
  }

  const valid = await verifyPassword(credential.password, current);
  if (!valid) {
    return { ok: false, error: "Password sekarang salah." };
  }

  const hashed = await hashPassword(next);
  await db
    .update(accounts)
    .set({ password: hashed, updatedAt: new Date() })
    .where(eq(accounts.id, credential.id));

  return { ok: true };
}
