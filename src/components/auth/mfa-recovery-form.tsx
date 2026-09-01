"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { requestMfaRecovery } from "@/lib/actions/admin/mfa-recovery";

export function MfaRecoveryForm() {
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setStatus("");
    try {
      await requestMfaRecovery({ email, password, reason });
      setStatus("Request received. Recovery requires 72 hours and two administrator approvals.");
    } catch { setStatus("Unable to create recovery request."); }
    finally { setLoading(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Account email" />
    <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Current password" />
    <Textarea value={reason} onChange={(e) => setReason(e.target.value)} minLength={20} maxLength={1000} required placeholder="Explain why no passkey, authenticator code, or recovery code is available." />
    <Button className="w-full" disabled={loading || reason.trim().length < 20}>{loading ? "Submitting…" : "Request manual recovery"}</Button>
    {status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}
  </form>;
}
