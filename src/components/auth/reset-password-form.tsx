"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function ResetPasswordForm({
  token,
  callbackURL,
}: {
  token?: string;
  callbackURL?: string;
}) {
  const { t } = useT();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const hasToken = Boolean(token);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError(t("Password minimal 8 karakter.", "Password must be at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setError(t("Password tidak cocok.", "Passwords do not match."));
      return;
    }
    if (!token) {
      setError(t("Token reset tidak ada. Silakan minta link baru.", "Reset token missing. Please request a new link."));
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(result.error.message ?? t("Gagal mereset password", "Failed to reset password"));
        return;
      }

      setDone(true);
      const target = callbackURL || "/login";
      setTimeout(() => router.push(target), 1500);
    } catch {
      setError(t("Terjadi kesalahan. Coba lagi.", "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">{t("Password direset", "Password Reset")}</CardTitle>
          <CardDescription>
            {t("Password kamu sudah diperbarui. Mengarahkan ke halaman masuk\u2026", "Your password has been updated. Redirecting to login\u2026")}
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link
            href={callbackURL || "/login"}
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("Kembali ke halaman masuk", "Back to login")}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Image src="/logo-icon.png" alt="Cubiqlo" width={40} height={40} className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover" />
        <CardTitle className="text-2xl">{t("Buat password baru", "Create new password")}</CardTitle>
        <CardDescription>
          {t("Masukkan password baru untuk akun Cubiqlo kamu.", "Enter a new password for your Cubiqlo account.")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!hasToken && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t("Token reset tidak ditemukan. Gunakan link dari email kamu, atau minta link baru.", "Reset token not found. Use the link from your email or request a new one.")}</span>
            </div>
          )}
          {error && hasToken && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">{t("Password baru", "New password")}</Label>
            <PasswordInput
              id="password"
              placeholder={t("Minimal 8 karakter", "At least 8 characters")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={!hasToken}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t("Konfirmasi password baru", "Confirm new password")}</Label>
            <PasswordInput
              id="confirm"
              placeholder={t("Ketik ulang", "Retype password")}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={!hasToken}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !hasToken}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Perbarui password", "Update password")}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <Link
          href={hasToken ? "/forgot-password" : "/login"}
          className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          {hasToken ? t("Minta link baru", "Request new link") : t("Kembali ke halaman masuk", "Back to login")}
        </Link>
      </CardFooter>
    </Card>
  );
}
