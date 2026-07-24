"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
        const msg = result.error.message ?? "Email atau password salah";
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
      setError("Terjadi kesalahan. Coba lagi.");
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
      setError("Gagal mengirim email verifikasi. Coba lagi nanti.");
    } finally {
      setResending(false);
    }
  }

  return (
    <Card className="w-full border-slate-200 bg-white shadow-xl shadow-slate-200/50">
      <CardHeader className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Selamat datang kembali</h1>
        <CardDescription>
          Masuk ke workspace Cubiqlo kamu
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
              <p className="font-medium">Email belum diverifikasi</p>
              <p className="text-amber-800">
                Kamu perlu verifikasi email sebelum bisa login. Cek inbox atau folder spam.
              </p>
              {resent ? (
                <div className="flex items-center gap-1.5 text-green-800">
                  <CheckCircle className="h-4 w-4" />
                  <span>Email verifikasi terkirim!</span>
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
                  Kirim ulang email verifikasi
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
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Lupa password?
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Sedang masuk…" : "Masuk"}
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Belum punya akun?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Daftar
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
