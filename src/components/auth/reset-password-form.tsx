"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Loader2, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
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

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Link reset tidak valid atau tidak ada. Silakan minta link baru.");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    if (password !== confirm) {
      setError("Password tidak cocok.");
      return;
    }
    if (!token) {
      setError("Token reset tidak ada. Silakan minta link baru.");
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (result.error) {
        setError(result.error.message ?? "Gagal mereset password");
        return;
      }

      setDone(true);
      // Redirect to login after a short pause so the success state registers
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-2xl">Password direset</CardTitle>
          <CardDescription>
            Password kamu sudah diperbarui. Mengarahkan ke halaman masuk&hellip;
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Kembali ke halaman masuk
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1 text-center">
        <Image src="/logo-icon.png" alt="Cubiqlo" width={40} height={40} className="mx-auto mb-3 h-10 w-10 rounded-lg object-cover" />
        <CardTitle className="text-2xl">Buat password baru</CardTitle>
        <CardDescription>
          Masukkan password baru untuk akun Cubiqlo kamu.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {!token && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Token reset tidak ditemukan. Gunakan link dari email kamu, atau minta link baru.</span>
            </div>
          )}
          {error && token && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password">Password baru</Label>
            <PasswordInput
              id="password"
              placeholder="Minimal 8 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={!token}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Konfirmasi password baru</Label>
            <PasswordInput
              id="confirm"
              placeholder="Ketik ulang"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={!token}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Perbarui password
          </Button>
        </CardContent>
      </form>
      <CardFooter className="flex justify-center">
        <Link
          href={token ? "/forgot-password" : "/login"}
          className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-3 w-3" />
          {token ? "Minta link baru" : "Kembali ke halaman masuk"}
        </Link>
      </CardFooter>
    </Card>
  );
}
