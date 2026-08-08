"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactFormProps = {
  siteSlug: string;
};

export function ContactForm({ siteSlug }: ContactFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "sending") return;

    if (hp) {
      // Honeypot caught — simulate success silently
      setStatus("success");
      return;
    }

    setStatus("sending");
    setError("");

    try {
      const res = await fetch(`/site/${siteSlug}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone: phone || undefined, message, _hp: hp }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Gagal mengirim pesan" }));
        setError(data.error ?? "Gagal mengirim pesan. Coba lagi.");
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError("Gagal mengirim pesan. Periksa koneksi internet.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <p className="text-emerald-700 font-medium text-sm">Pesan terkirim!</p>
        <p className="text-emerald-600 text-xs mt-1">Kami akan menghubungi Anda segera.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Honeypot — hidden from humans, visible to bots */}
      <div className="absolute opacity-0 pointer-events-none" aria-hidden="true">
        <Label htmlFor="hp">Leave empty</Label>
        <Input id="hp" name="_hp" value={hp} onChange={(e) => setHp(e.target.value)} tabIndex={-1} autoComplete="off" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-name" className="text-xs">Nama *</Label>
        <Input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="Nama Anda"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-email" className="text-xs">Email *</Label>
        <Input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="email@example.com"
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-phone" className="text-xs">Telepon (opsional)</Label>
        <Input
          id="cf-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+62..."
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-message" className="text-xs">Pesan *</Label>
        <textarea
          id="cf-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          placeholder="Tulis pesan Anda..."
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[80px]"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? (
          <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Mengirim...</>
        ) : (
          "Kirim Pesan"
        )}
      </Button>
    </form>
  );
}
