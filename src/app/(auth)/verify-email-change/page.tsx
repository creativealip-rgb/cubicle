import Link from "next/link";
import { db } from "@/db";
import { verifications, users, accounts } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle } from "lucide-react";
import { getCurrentLang, createT } from "@/lib/i18n";

export default async function VerifyEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const { token } = await searchParams;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <Card className="w-full max-w-md rounded-2xl border shadow-none text-center">
          <CardHeader className="pb-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mb-2">
              <XCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">{t("Token Tidak Valid", "Invalid Token")}</CardTitle>
            <CardDescription className="text-xs">
              {t(
                "Link verifikasi ganti email tidak ditemukan atau rusak.",
                "Email change verification link is missing or corrupted.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full rounded-xl">
              <Link href="/app/settings?tab=account">{t("Kembali ke Pengaturan", "Back to Settings")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Find verification record
  const now = new Date();
  const [record] = await db
    .select()
    .from(verifications)
    .where(and(eq(verifications.value, token), gt(verifications.expiresAt, now)))
    .limit(1);

  if (!record || !record.identifier.startsWith("change_email:")) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <Card className="w-full max-w-md rounded-2xl border shadow-none text-center">
          <CardHeader className="pb-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mb-2">
              <XCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">{t("Link Kedaluwarsa", "Expired Link")}</CardTitle>
            <CardDescription className="text-xs">
              {t(
                "Link verifikasi ganti email sudah kedaluwarsa atau sudah pernah digunakan.",
                "Email change verification link has expired or was already used.",
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full rounded-xl">
              <Link href="/app/settings?tab=account">{t("Kembali ke Pengaturan", "Back to Settings")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Identifier format: "change_email:userId:newEmail"
  const parts = record.identifier.split(":");
  const userId = parts[1];
  const newEmail = parts.slice(2).join(":").toLowerCase();

  // Check if new email is already taken by someone else in the meantime
  const [existingUser] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, newEmail))
    .limit(1);

  if (existingUser && existingUser.id !== userId) {
    await db.delete(verifications).where(eq(verifications.id, record.id));
    return (
      <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
        <Card className="w-full max-w-md rounded-2xl border shadow-none text-center">
          <CardHeader className="pb-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 text-rose-600 mb-2">
              <XCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg">{t("Email Sudah Terdaftar", "Email Already Registered")}</CardTitle>
            <CardDescription className="text-xs">
              {t(
                `Alamat email ${newEmail} sudah dipakai oleh akun lain.`,
                `The email address ${newEmail} is already in use by another account.`,
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full rounded-xl">
              <Link href="/app/settings?tab=account">{t("Kembali ke Pengaturan", "Back to Settings")}</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Update user email & delete verification token
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        email: newEmail,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await tx
      .update(accounts)
      .set({
        accountId: newEmail,
        updatedAt: new Date(),
      })
      .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")));

    await tx.delete(verifications).where(eq(verifications.id, record.id));
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md rounded-2xl border shadow-none text-center">
        <CardHeader className="pb-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-lg">{t("Email Berhasil Diubah!", "Email Successfully Changed!")}</CardTitle>
          <CardDescription className="text-xs">
            {t(
              "Alamat email login akun kamu sekarang adalah",
              "Your account login email address is now",
            )}{" "}
            <span className="font-semibold text-foreground">{newEmail}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full rounded-xl">
            <Link href="/app/settings?tab=account">{t("Lanjut ke Akun", "Continue to Account")}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
