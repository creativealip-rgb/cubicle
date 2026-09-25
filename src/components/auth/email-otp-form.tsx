"use client";
import { useEffect, useState } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";

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
  const { t } = useT();
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
      if (!r.ok) {
        setError(
          data.error ??
            t("Kode OTP tidak valid atau kadaluarsa", "Invalid or expired OTP code"),
        );
      } else {
        onSuccess(data.redirectTo ?? "/app/dashboard");
      }
    } catch {
      setError(
        t("Terjadi kesalahan. Coba lagi.", "An error occurred. Please try again."),
      );
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
      if (!r.ok) {
        setError(
          data.error ??
            t("Gagal mengirim ulang kode", "Failed to resend code"),
        );
      } else {
        setCooldown(60);
      }
    } catch {
      setError(
        t("Terjadi kesalahan. Coba lagi.", "An error occurred. Please try again."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={verify} className="space-y-4" aria-busy={loading}>
      <p className="text-sm text-muted-foreground">
        {t(
          `Kode 6 digit telah dikirim ke `,
          `A 6-digit code has been sent to `,
        )}
        <strong className="text-foreground">{maskedEmail}</strong>.
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
        <Label htmlFor="login-otp">{t("Kode OTP", "OTP Code")}</Label>
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
          placeholder="······"
          required
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("Berlaku sampai", "Valid until")}{" "}
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
        {t("Verifikasi & Masuk", "Verify & Sign In")}
      </LoadingButton>

      <div className="flex justify-between text-xs">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
        >
          {t("Ganti email", "Change email")}
        </button>
        <button
          type="button"
          onClick={resend}
          disabled={cooldown > 0 || loading}
          className="text-muted-foreground hover:text-foreground underline underline-offset-2 disabled:no-underline disabled:opacity-50 transition-colors"
        >
          {cooldown
            ? t(`Kirim ulang (${cooldown}d)`, `Resend code (${cooldown}s)`)
            : t("Kirim ulang kode", "Resend code")}
        </button>
      </div>
    </form>
  );
}

