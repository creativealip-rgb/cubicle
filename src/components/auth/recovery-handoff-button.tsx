"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
export function RecoveryHandoffButton({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function redeem() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/recovery/redeem", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const result = await response.json();
      if (!response.ok) setError(result.error ?? "Recovery link invalid");
      else router.replace(result.redirectTo);
    } catch {
      setError("Recovery failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button className="mt-6 w-full" onClick={redeem} disabled={busy}>
        {busy ? "Recovering…" : "Continue securely"}
      </Button>
    </>
  );
}
