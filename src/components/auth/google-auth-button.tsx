"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { authClient } from "@/lib/auth-client";

export function GoogleAuthButton({ callbackURL }: { callbackURL: string }) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function continueWithGoogle() {
    setLoading(true);
    setError("");
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL });
      if (result.error) setError(result.error.message ?? "Gagal masuk dengan Google");
    } catch {
      setError("Gagal masuk dengan Google. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">atau</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <Button type="button" variant="outline" className="w-full bg-white" onClick={continueWithGoogle} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark />}
        {loading ? t("Menghubungkan…", "Connecting…") : t("Lanjutkan dengan Google", "Continue with Google")}
      </Button>
      {error ? <p role="alert" className="text-center text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.2V7.3H3.2a10 10 0 0 0 0 9.4l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.3l3.3 2.6A5.8 5.8 0 0 1 12 5.9Z" />
    </svg>
  );
}