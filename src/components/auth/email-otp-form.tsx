"use client";
import { useEffect, useState } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function EmailOtpForm({
  maskedEmail,
  expiresAt,
  onSuccess,
  onBack,
}: {
  maskedEmail: string;
  expiresAt: string;
  onSuccess: (redirectTo: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  useEffect(() => {
    const id = setInterval(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/password-login/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "Kode OTP tidak valid");
      else onSuccess(data.redirectTo ?? "/app/dashboard");
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }
  async function resend() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/auth/password-login/resend", {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) setError(data.error ?? "Gagal mengirim ulang kode");
      else setCooldown(60);
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={verify} className="space-y-4" aria-busy={loading}>
      <p className="text-sm text-muted-foreground">
        Kode 6 digit dikirim ke <strong>{maskedEmail}</strong>.
      </p>
      {error && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="login-otp">Kode OTP</Label>
        <Input
          id="login-otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={code}
          onChange={(e) =>
            setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
          }
          className="text-center font-mono text-xl tracking-[0.35em]"
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Berlaku sampai{" "}
        {new Date(expiresAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        .
      </p>
      <LoadingButton
        className="w-full"
        loading={loading}
        disabled={code.length !== 6}
      >
        Verifikasi & masuk
      </LoadingButton>
      <div className="flex justify-between text-xs">
        <button type="button" onClick={onBack} className="underline">
          Ganti email
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || loading}
          className="underline disabled:no-underline"
        >
          {cooldown ? `Kirim ulang (${cooldown}s)` : "Kirim ulang kode"}
        </button>
      </div>
    </form>
  );
}
