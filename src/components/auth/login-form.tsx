"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,

} from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useT } from "@/lib/i18n-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useT();
  const requestedRedirect = searchParams.get("redirect");
  const redirect = requestedRedirect?.startsWith("/") && !requestedRedirect.startsWith("//") ? requestedRedirect : "/app/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setResent(false);
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });

      if (result.error) {
        const msg = result.error.message ?? t("Email atau password salah", "Email or password incorrect");
        if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("email not verified")) {
          setUnverified(true);
          setUnverifiedEmail(email);
        } else {
          setError(msg);
        }
        return;
      }

      router.push(redirect);
      router.refresh();
    } catch {
      setError(t("Terjadi kesalahan. Coba lagi.", "An error occurred. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!unverifiedEmail) return;
    setResending(true);
    try {
      await authClient.sendVerificationEmail({
        email: unverifiedEmail,
        callbackURL: "/app/dashboard",
      });
      setResent(true);
    } catch {
      setError(t("Gagal mengirim email verifikasi. Coba lagi nanti.", "Failed to send verification email. Try again later."));
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <CardHeader className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Selamat datang kembali", "Welcome back")}</h1>
        <CardDescription>
          {t("Masuk ke workspace Cubiqlo kamu", "Sign in to your Cubiqlo workspace")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <CardContent className="space-y-4">
          {error && (
            <div role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {unverified && (
            <div role="alert" aria-live="polite" className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 space-y-2">
              <p className="font-medium">{t("Email belum diverifikasi", "Email not verified")}</p>
              <p className="text-amber-800">
                {t("Kamu perlu verifikasi email sebelum bisa login. Cek inbox atau folder spam.", "You need to verify your email before signing in. Check your inbox or spam folder.")}
              </p>
              {resent ? (
                <div className="flex items-center gap-1.5 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span>{t("Email verifikasi terkirim!", "Verification email sent!")}</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  onClick={handleResendVerification}
                  disabled={resending}
                >
                  {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {t("Kirim ulang email verifikasi", "Resend verification email")}
                </Button>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("Password", "Password")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                {t("Lupa password?", "Forgot password?")}
              </Link>
            </div>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <LoadingButton type="submit" className="w-full" loading={loading}>
            {t("Masuk", "Sign in")}
          </LoadingButton>
          <GoogleAuthButton callbackURL={redirect} />
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("Belum punya akun?", "Don't have an account?")}{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Daftar", "Sign up")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
