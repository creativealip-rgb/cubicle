"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completePasskeyMfaEnrollment } from "@/lib/actions/mfa-enrollment";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  canContinueFromRecovery,
  getWizardStep,
  type WizardState,
} from "@/lib/mfa/setup-wizard";

type AuthenticatorStage = "password" | "verify";

export function MfaSetupForm() {
  const router = useRouter();
  const [state, setState] = useState<WizardState>("method");
  const [authenticatorStage, setAuthenticatorStage] =
    useState<AuthenticatorStage>("password");
  const [password, setPassword] = useState("");
  const [uri, setUri] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [completionMethod, setCompletionMethod] = useState<
    "passkey" | "authenticator"
  >("authenticator");
  const step = getWizardStep(state);

  async function addPasskey() {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.passkey.addPasskey({
        name: "Cubiqlo passkey",
        createSession: false,
      });
      if (result.error) {
        setError(result.error.message ?? "Could not register passkey");
        return;
      }
      const completion = await completePasskeyMfaEnrollment();
      if ("error" in completion) {
        setError(completion.error ?? "Could not complete passkey setup");
        return;
      }
      setCompletionMethod("passkey");
      setState("complete");
    } catch {
      setError("Could not register passkey");
    } finally {
      setLoading(false);
    }
  }

  async function startAuthenticator() {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.twoFactor.enable({
        password,
        method: "totp",
        issuer: "Cubiqlo",
      });
      if (result.error) {
        setError(result.error.message ?? "Could not start MFA setup");
      } else if (result.data.method === "totp") {
        setUri(result.data.totpURI);
        setBackupCodes(result.data.backupCodes);
        setAuthenticatorStage("verify");
      } else {
        setError("TOTP setup unavailable");
      }
    } catch {
      setError("Could not start MFA setup");
    } finally {
      setLoading(false);
    }
  }

  async function verifyAuthenticator() {
    setError("");
    setLoading(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({
        code,
        trustDevice: false,
      });
      if (result.error) {
        setError(result.error.message ?? "Invalid verification code");
      } else {
        setState("recovery");
      }
    } catch {
      setError("Invalid verification code");
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value);
  }

  function downloadRecoveryCodes() {
    const url = URL.createObjectURL(
      new Blob([backupCodes.join("\n")], { type: "text/plain" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "cubiqlo-recovery-codes.txt";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto flex w-full max-w-[520px] items-start px-4 py-6 sm:min-h-[70vh] sm:items-center sm:py-8">
      <section className="w-full overflow-hidden rounded-3xl border bg-card shadow-[0_24px_70px_-32px_rgba(76,29,149,0.45)]">
        <header className="bg-gradient-to-br from-violet-700 via-purple-600 to-fuchsia-500 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            Account security
          </p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            {state === "method"
              ? "Set up two-step verification"
              : state === "authenticator"
                ? "Set up authenticator"
                : state === "recovery"
                  ? "Save your recovery codes"
                  : "Two-step verification is ready"}
          </h1>
          {state !== "complete" && state !== "recovery" && (
            <>
              <p className="mt-2 text-sm text-white/90">
                Step {step.number} of 2
              </p>
              <div
                className="mt-5 flex gap-2"
                aria-label={`Step ${step.number} of 2`}
              >
                {[1, 2].map((item) => (
                  <span
                    key={item}
                    className={`h-1.5 flex-1 rounded-full ${item <= step.number ? "bg-white" : "bg-white/30"}`}
                  />
                ))}
              </div>
            </>
          )}
        </header>

        <div className="space-y-5 p-6 sm:p-8">
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          {state === "method" && (
            <div className="space-y-3">
              <button
                type="button"
                disabled={loading}
                onClick={addPasskey}
                className="group w-full rounded-2xl border-2 border-primary bg-primary/5 p-4 text-left transition hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <span className="flex items-center justify-between gap-3 font-semibold">
                  Set up a passkey
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] uppercase tracking-wide text-primary-foreground">
                    Recommended
                  </span>
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {loading
                    ? "Waiting for your device…"
                    : "Use Face ID, fingerprint, or your device PIN."}
                </span>
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => {
                  setError("");
                  setState("authenticator");
                }}
                className="w-full rounded-2xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <span className="font-semibold">Use authenticator app</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  Enter a six-digit code from your authenticator app.
                </span>
              </button>
            </div>
          )}

          {state === "authenticator" && authenticatorStage === "password" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Confirm your password before connecting an authenticator app.
              </p>
              <div className="space-y-2">
                <Label htmlFor="mfa-password">Current password</Label>
                <Input
                  id="mfa-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              <Button
                className="min-h-11 w-full"
                type="button"
                onClick={startAuthenticator}
                disabled={loading || !password}
              >
                {loading ? "Loading…" : "Continue"}
              </Button>
              <Button
                className="w-full"
                type="button"
                variant="ghost"
                onClick={() => setState("method")}
              >
                Back to methods
              </Button>
            </div>
          )}

          {state === "authenticator" && authenticatorStage === "verify" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add this setup key to your authenticator, then enter its code.
              </p>
              <div className="rounded-2xl border bg-muted/40 p-3">
                <code className="block max-h-28 overflow-auto break-all text-xs">
                  {uri}
                </code>
                <Button
                  className="mt-3"
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyText(uri)}
                >
                  Copy setup key
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mfa-code">6-digit code</Label>
                <Input
                  id="mfa-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                />
              </div>
              <Button
                className="min-h-11 w-full"
                type="button"
                onClick={verifyAuthenticator}
                disabled={loading || code.length !== 6}
              >
                {loading ? "Verifying…" : "Enable two-step verification"}
              </Button>
            </div>
          )}

          {state === "recovery" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each code works once. Store them somewhere private before
                continuing.
              </p>
              <code className="grid grid-cols-1 gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:grid-cols-2">
                {backupCodes.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </code>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void copyText(backupCodes.join("\n"))}
                >
                  Copy all
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={downloadRecoveryCodes}
                >
                  Download
                </Button>
              </div>
              <label className="flex min-h-11 items-center gap-3 rounded-xl border px-3 text-sm">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                I saved my recovery codes
              </label>
              <Button
                className="min-h-11 w-full"
                type="button"
                disabled={!canContinueFromRecovery(backupCodes, confirmed)}
                onClick={() => router.replace("/app/dashboard")}
              >
                Continue to dashboard
              </Button>
            </div>
          )}

          {state === "complete" && (
            <div role="status" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {completionMethod === "passkey"
                  ? "Your passkey is saved and your account is protected."
                  : "Your authenticator is active and your account is protected."}
              </p>
              <Button
                className="min-h-11 w-full bg-violet-700 text-white hover:bg-violet-800"
                type="button"
                onClick={() => router.replace("/app/dashboard")}
              >
                Continue to dashboard
              </Button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default MfaSetupForm;
