"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
export default function RecoveryHandoffPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function redeem() {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/auth/recovery/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const d = await r.json();
      if (!r.ok) setError(d.error ?? "Recovery link invalid");
      else router.replace(d.redirectTo);
    } catch {
      setError("Recovery failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthShell>
      <div className="w-full max-w-md rounded-xl border bg-white p-6 shadow-xl">
        <h1 className="text-xl font-semibold">Recover account access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This one-time link signs you in, then opens Account Settings. Change
          your email or password there.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button className="mt-6 w-full" onClick={redeem} disabled={busy}>
          {busy ? "Recovering…" : "Continue securely"}
        </Button>
      </div>
    </AuthShell>
  );
}
