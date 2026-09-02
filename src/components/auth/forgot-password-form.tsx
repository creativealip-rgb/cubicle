"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n-client";

export function ForgotPasswordForm() {
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.requestPasswordReset({
        email,
      });

      if (result.error) {
        setError(result.error.message ?? t("Gagal memproses permintaan", "Failed to process request"));
        return;
      }

      setSent(true);
    } catch {
      setError(t("Terjadi kesalahan. Coba lagi.", "An error occurred. Try again."));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">{t("Cek email kamu", "Check your email")}</CardTitle>
          <CardDescription>
            {t("Kami sudah mengirim link reset password ke", "We sent a password reset link to")}{" "}
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {t("Kembali ke halaman masuk", "Back to sign in")}
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Image src="/logo-icon.png" alt="Cubiqlo" width={40} height={40} className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover" />
        <CardTitle className="text-2xl">{t("Reset password", "Reset password")}</CardTitle>
        <CardDescription>
          {t("Masukkan email kamu dan kami kirim link reset-nya", "Enter your email and we will send you a reset link")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">{t("Email", "Email")}</Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@contoh.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("Kirim link reset", "Send reset link")}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex flex-col items-center gap-3 pt-2">
        <Link
          href="/login"
          className="flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          {t("Kembali ke halaman masuk", "Back to sign in")}
        </Link>
        <div className="w-full border-t pt-3 text-center space-y-1">
          <p className="text-[11px] text-muted-foreground">
            {t("Lupa password atau tidak bisa akses email?", "Forgot password or lost email access?")}{" "}
            <Link
              href="/two-factor"
              className="font-medium text-primary hover:underline"
            >
              {t("Masuk dengan 2FA / Passkey", "Sign in with 2FA / Passkey")}
            </Link>
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("Kehilangan semua akses akun?", "Lost all account access?")}{" "}
            <Link
              href="/mfa/recovery"
              className="hover:underline text-muted-foreground"
            >
              {t("Ajukan pemulihan manual", "Request manual recovery")}
            </Link>
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}
