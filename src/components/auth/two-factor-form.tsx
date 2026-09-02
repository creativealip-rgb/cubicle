"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Fingerprint, KeyRound, ShieldAlert, Smartphone, ArrowLeft, Loader2 } from "lucide-react";

type Method = "totp" | "passkey" | "backup" | "recovery";

export function TwoFactorForm() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signInWithPasskey() {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.signIn.passkey();
      if (result.error) {
        setError(result.error.message ?? "Verifikasi Passkey gagal");
      } else {
        router.push("/app/dashboard");
      }
    } catch {
      setError("Verifikasi Passkey gagal atau dibatalkan");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result =
        method === "backup"
          ? await authClient.twoFactor.verifyBackupCode({ code: code.trim() })
          : await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: false });

      if (result.error) {
        setError(result.error.message ?? "Kode verifikasi tidak valid");
      } else {
        router.push("/app/dashboard");
      }
    } catch {
      setError("Kode verifikasi salah atau kedaluwarsa");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-slate-950 overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.25),rgba(255,255,255,0))]" />
      <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-fuchsia-600/20 blur-3xl pointer-events-none" />

      <Card className="relative z-10 w-full max-w-[440px] rounded-3xl border border-slate-800 bg-card shadow-[0_24px_70px_-32px_rgba(76,29,149,0.55)] overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-500 p-6 text-white text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-md mb-2">
            {method === "passkey" ? (
              <Fingerprint className="h-6 w-6 text-white" />
            ) : method === "backup" ? (
              <KeyRound className="h-6 w-6 text-white" />
            ) : (
              <Smartphone className="h-6 w-6 text-white" />
            )}
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">
            {method === "passkey"
              ? "Verifikasi dengan Passkey"
              : method === "backup"
                ? "Gunakan Recovery Backup Code"
                : "Verifikasi 2 Langkah"}
          </CardTitle>
          <CardDescription className="text-xs text-white/85">
            {method === "passkey"
              ? "Gunakan sidik jari, Face ID, atau PIN perangkatmu"
              : method === "backup"
                ? "Masukkan salah satu dari 10 kode cadangan yang pernah kamu simpan"
                : "Masukkan 6 digit kode dari aplikasi Authenticator (Google / Microsoft Auth)"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 font-medium text-center">
              {error}
            </div>
          )}

          {/* Quick Primary Passkey Action Button */}
          {method !== "passkey" && (
            <Button
              type="button"
              variant="outline"
              onClick={signInWithPasskey}
              disabled={loading}
              className="w-full h-11 rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Fingerprint className="h-4 w-4 text-primary" />
              <span>Verifikasi cepat dengan Passkey / Biometrik</span>
            </Button>
          )}

          {method === "passkey" ? (
            <div className="space-y-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">
                Klik tombol di bawah untuk memunculkan prompt biometrik pada browsermu.
              </p>
              <Button
                type="button"
                onClick={signInWithPasskey}
                disabled={loading}
                className="w-full h-11 rounded-xl text-xs font-semibold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Fingerprint className="h-4 w-4 mr-2" />}
                {loading ? "Menunggu respon perangkat…" : "Buka Prompt Passkey"}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="two-factor-code" className="text-xs">
                  {method === "backup" ? "Recovery Backup Code (10 Karakter)" : "6-Digit Authenticator Code"}
                </Label>
                <Input
                  id="two-factor-code"
                  autoFocus
                  required
                  type="text"
                  inputMode={method === "backup" ? "text" : "numeric"}
                  autoComplete="one-time-code"
                  maxLength={method === "backup" ? 32 : 6}
                  placeholder={method === "backup" ? "Contoh: a1b2c3d4e5" : "000000"}
                  value={code}
                  onChange={(e) => setCode(method === "backup" ? e.target.value : e.target.value.replace(/\D/g, ""))}
                  className="h-11 text-center text-lg font-mono tracking-widest rounded-xl"
                />
              </div>
              <Button type="submit" disabled={loading || !code} className="w-full h-11 rounded-xl text-xs font-semibold">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {loading ? "Memverifikasi…" : "Verifikasi & Masuk"}
              </Button>
            </form>
          )}

          {/* Alternative Verification Methods Selector */}
          <div className="border-t pt-3 space-y-2 text-center text-xs">
            <p className="text-muted-foreground font-medium text-[11px]">Pilihan metode lain:</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {method !== "totp" && (
                <button
                  type="button"
                  onClick={() => { setMethod("totp"); setCode(""); setError(""); }}
                  className="text-primary hover:underline font-medium text-xs px-2 py-1 rounded-lg bg-muted/50"
                >
                  Gunakan Authenticator App
                </button>
              )}
              {method !== "passkey" && (
                <button
                  type="button"
                  onClick={() => { setMethod("passkey"); setError(""); }}
                  className="text-primary hover:underline font-medium text-xs px-2 py-1 rounded-lg bg-muted/50"
                >
                  Gunakan Passkey
                </button>
              )}
              {method !== "backup" && (
                <button
                  type="button"
                  onClick={() => { setMethod("backup"); setCode(""); setError(""); }}
                  className="text-primary hover:underline font-medium text-xs px-2 py-1 rounded-lg bg-muted/50"
                >
                  Gunakan Recovery Code (Kode Cadangan)
                </button>
              )}
            </div>
          </div>
        </CardContent>

        <CardFooter className="bg-muted/30 border-t p-4 flex flex-col items-center gap-2">
          <Link
            href="/mfa/recovery"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground font-medium transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
            <span>Kehilangan semua akses 2FA? Ajukan Pemulihan Manual</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:underline mt-1"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Kembali ke halaman login</span>
          </Link>
        </CardFooter>
      </Card>
    </main>
  );
}
