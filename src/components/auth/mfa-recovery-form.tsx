"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestMfaRecovery } from "@/lib/actions/admin/mfa-recovery";
import { useT } from "@/lib/i18n-client";
import { Loader2 } from "lucide-react";

export function MfaRecoveryForm() {
  const { t } = useT();
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    setError("");
    try {
      await requestMfaRecovery({ email, password, reason });
      setStatus(
        t(
          "Permintaan pemulihan telah dikirim. Memerlukan waktu 72 jam dan persetujuan 2 administrator.",
          "Recovery request received. Requires 72 hours cooling period and approval from two administrators.",
        ),
      );
    } catch {
      setError(
        t(
          "Gagal mengajukan pemulihan. Pastikan email dan password akunmu benar.",
          "Unable to create recovery request. Please verify your email and password.",
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-600 font-medium text-center">
          {error}
        </div>
      )}
      {status && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 font-medium text-center">
          {status}
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="rec-email" className="text-xs">
          {t("Email akun", "Account email")}
        </Label>
        <Input
          id="rec-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="name@example.com"
          className="h-10 text-xs rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rec-pw" className="text-xs">
          {t("Password akun", "Account password")}
        </Label>
        <Input
          id="rec-pw"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="h-10 text-xs rounded-xl"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rec-reason" className="text-xs">
          {t("Alasan kehilangan akses (min. 20 karakter)", "Reason for loss of access (min. 20 characters)")}
        </Label>
        <Textarea
          id="rec-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          minLength={20}
          maxLength={1000}
          required
          placeholder={t(
            "Jelaskan mengapa Passkey, kode Authenticator, atau Recovery Code tidak dapat diakses…",
            "Explain why no passkey, authenticator code, or recovery code is available…",
          )}
          className="text-xs rounded-xl min-h-[90px]"
        />
      </div>
      <Button
        className="w-full h-10 rounded-xl text-xs font-semibold"
        disabled={loading || reason.trim().length < 20}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {loading ? t("Mengirim…", "Submitting…") : t("Ajukan Pemulihan Manual", "Request Manual Recovery")}
      </Button>
    </form>
  );
}
