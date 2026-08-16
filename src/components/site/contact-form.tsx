"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/i18n-client";

type ContactFormProps = {
  siteSlug: string;
};

export function ContactForm({ siteSlug }: ContactFormProps) {
  const { t } = useT();
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
        const data = await res.json().catch(() => ({ error: "" }));
        setError(data.error ?? t("Gagal mengirim pesan. Coba lagi.", "Failed to send your message. Please try again."));
        setStatus("error");
        return;
      }

      setStatus("success");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      setError(t("Gagal mengirim pesan. Periksa koneksi internet.", "Failed to send your message. Check your internet connection."));
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center" role="status" aria-live="polite">
        <p className="text-emerald-700 font-medium text-sm">{t("Pesan terkirim!", "Message sent!")}</p>
        <p className="text-emerald-600 text-xs mt-1">{t("Kami akan menghubungi Anda segera.", "We will get back to you shortly.")}</p>
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
        <Label htmlFor="cf-name" className="text-xs">{t("Nama *", "Name *")}</Label>
        <Input
          id="cf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder={t("Nama Anda", "Your name")}
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-email" className="text-xs">{t("Email *", "Email *")}</Label>
        <Input
          id="cf-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder={t("email@contoh.com", "email@example.com")}
          className="h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-phone" className="text-xs">{t("Telepon (opsional)", "Phone (optional)")}</Label>
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
        <Label htmlFor="cf-message" className="text-xs">{t("Pesan *", "Message *")}</Label>
        <textarea
          id="cf-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={4}
          placeholder={t("Tulis pesan Anda...", "Write your message...")}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y min-h-[80px]"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600" role="alert">{error}</p>
      )}

      <Button type="submit" disabled={status === "sending"} className="w-full">
        {status === "sending" ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> {t("Mengirim...", "Sending...")}</>
        ) : (
          t("Kirim Pesan", "Send Message")
        )}
      </Button>
    </form>
  );
}
