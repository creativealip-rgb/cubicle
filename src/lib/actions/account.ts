"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@better-auth/utils/password";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { accounts, sessions, users, verifications } from "@/db/schema";
import { requireAppSession } from "@/lib/app-auth";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { validatePasswordChange } from "@/lib/settings-validation";
import { sendNotification } from "@/lib/notifications";

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

export async function requestAccountEmailChange(
  newEmailRaw: string,
  currentPassword: string,
): Promise<AccountActionResult> {
  const session = await requireAppSession("/app/settings?tab=account");
  const newEmail = newEmailRaw.trim().toLowerCase();

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
    return { ok: false, error: "Format alamat email baru tidak valid." };
  }

  if (newEmail === session.user.email?.toLowerCase()) {
    return { ok: false, error: "Email baru sama dengan email saat ini." };
  }

  // Verify current password if user has credential password
  const [credential] = await db
    .select({ id: accounts.id, password: accounts.password })
    .from(accounts)
    .where(and(eq(accounts.userId, session.user.id), eq(accounts.providerId, "credential")))
    .limit(1);

  if (credential?.password) {
    if (!currentPassword) {
      return { ok: false, error: "Password saat ini wajib diisi untuk keamanan." };
    }
    const valid = await verifyPassword(credential.password, currentPassword);
    if (!valid) {
      return { ok: false, error: "Password sekarang salah." };
    }
  }

  // Check if new email is already taken by another user
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, newEmail))
    .limit(1);

  if (existingUser && existingUser.id !== session.user.id) {
    return { ok: false, error: "Email tersebut sudah digunakan oleh akun lain." };
  }

  // Generate verification token (expires in 1 hour)
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  const identifier = `change_email:${session.user.id}:${newEmail}`;

  // Delete any existing change_email token for this user
  await db.delete(verifications).where(eq(verifications.identifier, identifier));

  await db.insert(verifications).values({
    id: randomBytes(16).toString("hex"),
    identifier,
    value: token,
    expiresAt,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "https://app.cubiqlo.com";
  const verifyUrl = `${appUrl.replace(/\/$/, "")}/verify-email-change?token=${token}`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f7f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1a1d24;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;">
      <tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
        <div style="font-size:14px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;">Cubiqlo</div>
      </td></tr>
      <tr><td style="padding:32px;font-size:15px;line-height:1.6;color:#1a1d24;">
        <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;">Konfirmasi Perubahan Email</h2>
        <p style="margin:0 0 16px;">Halo ${session.user.name ?? "Pengguna"},</p>
        <p style="margin:0 0 24px;">Kami menerima permintaan untuk mengganti email login akun Cubiqlo kamu ke <strong>${newEmail}</strong>. Klik tombol di bawah untuk mengonfirmasi (link berlaku selama 1 jam).</p>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="border-radius:8px;background:#1a1d24;">
            <a href="${verifyUrl}" target="_blank" style="display:inline-block;padding:12px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">Konfirmasi Email Baru</a>
          </td></tr>
        </table>
        <p style="margin:0 0 8px;font-size:13px;color:#6b7280;">Atau salin tautan berikut ke browsermu:</p>
        <p style="margin:0;font-size:13px;color:#6b7280;word-break:break-all;">${verifyUrl}</p>
      </td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
        <p style="margin:0;">Jika kamu tidak meminta perubahan ini, amankan akunmu segera.</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;

  await sendNotification({
    to: newEmail,
    subject: "Konfirmasi Perubahan Email Akun Cubiqlo",
    text: `Halo,\n\nKonfirmasi perubahan email ke ${newEmail} melalui tautan ini:\n${verifyUrl}\n\nLink berlaku 1 jam.`,
    html,
    type: "email_verification",
  });

  return { ok: true };
}

export async function updateAccountPassword(
  currentPassword: string,
  newPassword: string,
): Promise<AccountActionResult> {
  const session = await requireAppSession("/app/settings?tab=account");
  const validation = validatePasswordChange(currentPassword, newPassword);
  if (!validation.ok) return validation;
  const current = validation.currentPassword;
  const next = validation.newPassword;

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

  await auth.api.revokeOtherSessions({ headers: await headers() });

  return { ok: true };
}

export async function revokeAccountSession(id: string): Promise<AccountActionResult> {
  const session = await requireAppSession("/app/settings?tab=account");
  const deleted = await db.delete(sessions)
    .where(and(eq(sessions.id, id), eq(sessions.userId, session.user.id)))
    .returning({ id: sessions.id });
  if (!deleted.length) return { ok: false, error: "Sesi tidak ditemukan." };
  revalidatePath("/app/settings");
  return { ok: true };
}

export async function signOutOtherSessions(): Promise<AccountActionResult> {
  await requireAppSession("/app/settings?tab=account");
  await auth.api.revokeOtherSessions({ headers: await headers() });
  revalidatePath("/app/settings");
  return { ok: true };
}
