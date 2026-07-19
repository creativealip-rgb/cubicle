"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Link2Off, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";

type Props = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  status: string | null;
  lastError: string | null;
  redirectUri: string;
};

export function GoogleCalendarConnect({
  configured,
  connected,
  email,
  status,
  lastError,
  redirectUri,
}: Props) {
  const { t } = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const gcal = searchParams.get("gcal");
    if (!gcal) return;
    if (gcal === "connected") {
      toast.success(t("Google Calendar terhubung", "Google Calendar connected"));
    } else if (gcal === "denied") {
      toast.error(t("Akses Google ditolak", "Google access denied"));
    } else if (gcal === "missing_config") {
      toast.error(
        t(
          "Google OAuth belum dikonfigurasi di server",
          "Google OAuth is not configured on server",
        ),
      );
    } else if (gcal === "error") {
      toast.error(
        searchParams.get("error") ||
          t("Gagal hubungkan Google Calendar", "Failed to connect Google Calendar"),
      );
    }
    router.replace("/app/settings");
  }, [searchParams, router, t]);

  async function disconnect() {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success(t("Google Calendar diputus", "Google Calendar disconnected"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={connected ? "default" : "secondary"}>
          {connected
            ? t("Terhubung", "Connected")
            : configured
              ? t("Belum terhubung", "Not connected")
              : t("Belum dikonfigurasi", "Not configured")}
        </Badge>
        {status === "error" ? <Badge variant="destructive">Error</Badge> : null}
      </div>

      {connected ? (
        <div className="rounded-lg border bg-muted/30 p-3 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
            <div>
              <p className="font-medium">
                {t("Meeting baru otomatis masuk Google Calendar", "New meetings auto-sync to Google Calendar")}
              </p>
              <p className="text-muted-foreground">
                {email || t("Akun Google terhubung", "Google account connected")}
              </p>
              {lastError ? (
                <p className="mt-1 text-xs text-destructive">{lastError}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t(
            "Hubungkan akun Google supaya booking form publik langsung bikin event di kalender kamu.",
            "Connect Google so public booking form events appear on your calendar automatically.",
          )}
        </p>
      )}

      {!configured ? (
        <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">
            {t("Butuh setup Google Cloud OAuth (Web client)", "Needs Google Cloud OAuth (Web client) setup")}
          </p>
          <p className="mt-1">Redirect URI:</p>
          <code className="mt-1 block break-all rounded bg-muted px-2 py-1">{redirectUri}</code>
          <p className="mt-2">
            Env: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (opsional `GOOGLE_REDIRECT_URI`)
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={disconnect}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Link2Off className="mr-2 h-4 w-4" />
            )}
            {t("Putuskan", "Disconnect")}
          </Button>
        ) : (
          <Button type="button" size="sm" asChild disabled={!configured}>
            <a href="/api/integrations/google-calendar/connect">
              <Calendar className="mr-2 h-4 w-4" />
              {t("Hubungkan Google Calendar", "Connect Google Calendar")}
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
