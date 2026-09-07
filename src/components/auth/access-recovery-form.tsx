"use client";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function AccessRecoveryForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function passkey() {
    setBusy(true);
    setError("");
    try {
      const start = await fetch("/api/auth/recovery/passkey/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await start.json();
      if (data.status !== "passkey_required")
        throw new Error("Passkey unavailable");
      const credential = await startAuthentication({
        optionsJSON: data.options,
      });
      const verify = await fetch("/api/auth/recovery/passkey/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(credential),
      });
      const result = await verify.json();
      if (!verify.ok) throw new Error(result.error);
      router.replace(result.redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }
  async function backup(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/recovery/backup-code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      router.replace(result.redirectTo);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Recovery failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={backup} className="space-y-4">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@example.com"
        autoComplete="email"
        required
      />
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={passkey}
        disabled={busy || !email}
      >
        Recover with Passkey
      </Button>
      <div className="text-center text-xs text-muted-foreground">
        or use a backup code
      </div>
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="XXXXX-XXXXX"
        autoComplete="one-time-code"
      />
      <Button className="w-full" disabled={busy || !email || !code}>
        Recover with backup code
      </Button>
      {error && (
        <p role="alert" aria-live="polite" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
