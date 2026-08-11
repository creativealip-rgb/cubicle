"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { LoadingButton } from "@/components/ui/loading-button";
import { authClient } from "@/lib/auth-client";
import { GoogleAuthButton } from "@/components/auth/google-auth-button";
import { useT } from "@/lib/i18n-client";

export function SignupForm() {
  const router = useRouter();
  const { t } = useT();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signUp.email({
        name,
        email,
        password,
      });

      if (result.error) {
        setError(result.error.message ?? t("Gagal membuat akun", "Failed to create account"));
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setError(t("Terjadi kesalahan. Coba lagi.", "An error occurred. Try again."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <CardHeader className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Buat akun", "Create your account")}</h1>
        <CardDescription>
          {t("Mulai workspace Cubiqlo gratis", "Start your free Cubiqlo workspace")}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit} aria-busy={loading}>
        <CardContent className="space-y-4">
          {error && (
            <div role="alert" aria-live="polite" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name">{t("Nama lengkap", "Full name")}</Label>
            <Input
              id="name"
              type="text"
              placeholder="Budi Santoso"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
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
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">{t("Minimal 8 karakter", "At least 8 characters")}</p>
          </div>
          <LoadingButton type="submit" className="w-full" loading={loading}>
            {t("Buat akun", "Create account")}
          </LoadingButton>
          <GoogleAuthButton callbackURL="/onboarding" />
          <p className="text-center text-xs text-muted-foreground">
            {t("Dengan membuat akun, kamu menyetujui", "By creating an account, you agree to our")}{" "}
            <Link
              href="/terms"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("Syarat & Ketentuan", "Terms of Service")}
            </Link>{" "}
            {t("dan", "and")}{" "}
            <Link
              href="/privacy"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("Kebijakan Privasi", "Privacy Policy")}
            </Link>{" "}
            {t("kami.", ".")}
          </p>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          {t("Sudah punya akun?", "Already have an account?")}{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t("Masuk", "Sign in")}
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
