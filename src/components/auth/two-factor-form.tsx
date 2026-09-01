"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function TwoFactorForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const result = backup
        ? await authClient.twoFactor.verifyBackupCode({ code })
        : await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
      if (result.error) setError("Invalid verification code");
      else router.push("/app/dashboard");
    } catch {
      setError("Invalid verification code");
    } finally {
      setLoading(false);
    }
  }

  return <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4"><form onSubmit={submit} className="w-full space-y-4 rounded-xl border bg-card p-6 shadow-sm"><h1 className="text-2xl font-semibold">Two-step verification</h1><p className="text-sm text-muted-foreground">Enter code from authenticator app or recovery code.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Input autoFocus inputMode={backup ? "text" : "numeric"} autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={backup ? 32 : 6} required /><Button className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify"}</Button><button type="button" className="text-sm underline" onClick={() => { setBackup(!backup); setCode(""); }}>{backup ? "Use authenticator code" : "Use recovery code"}</button></form></main>;
}
