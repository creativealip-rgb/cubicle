"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MfaSetupForm() {
  const [password, setPassword] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function start() {
    setError("");
    setLoading(true);
    const result = await authClient.twoFactor.enable({ password, method: "totp", issuer: "Cubiqlo" });
    setLoading(false);
    if (result.error) setError(result.error.message ?? "Could not start MFA setup");
    else if (result.data.method === "totp") {
      setUri(result.data.totpURI);
      setBackupCodes(result.data.backupCodes);
    } else setError("TOTP setup unavailable");
  }

  async function verify() {
    setError("");
    setLoading(true);
    const result = await authClient.twoFactor.verifyTotp({ code, trustDevice: false });
    setLoading(false);
    if (result.error) setError(result.error.message ?? "Invalid verification code");
    else setDone(true);
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 py-8">
      <section className="w-full space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold">Set up two-step verification</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use an authenticator app. Keep recovery codes in a safe place.</p>
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {done ? <p role="status" className="text-sm font-medium">Two-step verification enabled.</p> : !uri ? (
          <div className="space-y-3">
            <Label htmlFor="mfa-password">Current password</Label>
            <Input id="mfa-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="button" onClick={start} disabled={loading || !password}>{loading ? "Loading…" : "Continue"}</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm">Add this URI to your authenticator app:</p>
            <code className="block max-h-32 overflow-auto break-all rounded bg-muted p-3 text-xs">{uri}</code>
            {backupCodes.length > 0 && (
              <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-sm font-medium">Save recovery codes now. Each works once.</p>
                <code className="grid grid-cols-2 gap-1 text-sm">{backupCodes.map((item) => <span key={item}>{item}</span>)}</code>
              </div>
            )}
            <Label htmlFor="mfa-code">6-digit code</Label>
            <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            <Button type="button" onClick={verify} disabled={loading || code.length !== 6}>{loading ? "Verifying…" : "Enable two-step verification"}</Button>
          </div>
        )}
      </section>
    </main>
  );
}

export default MfaSetupForm;
