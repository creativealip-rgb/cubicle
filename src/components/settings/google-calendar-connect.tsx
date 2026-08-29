"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Calendar, CheckCircle2, Link2Off, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { useConfirm } from "@/lib/hooks/use-confirm";

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
  redirectUri: _redirectUri,
}: Props) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const { confirm, dialog } = useConfirm();

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
    // Keep user on Integrations tab after OAuth toast.
    router.replace("/app/settings?tab=integrations");
  }, [searchParams, router, t]);

  async function disconnect() {
    const ok = await confirm({
      title: t("Putuskan Google Calendar?", "Disconnect Google Calendar?"),
      description: t("Putuskan Google Calendar dari akun ini?", "Disconnect Google Calendar from this account?"),
      confirmLabel: t("Putuskan", "Disconnect"),
      destructive: true,
    });
    if (!ok) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Disconnect failed");
      toast.success(t("Google Calendar diputus", "Google Calendar disconnected"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    {dialog}
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
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
          <p className="font-medium">
            {t("Fitur Ini Belum Diverifikasi Google (Soon)", "Feature Pending Google Verification (Soon)")}
          </p>
          <p className="mt-1">
            {t(
              "Integrasi ini sedang dikunci sementara hingga proses verifikasi aplikasi di Google Cloud Console selesai.",
              "This integration is temporarily locked until Google Cloud Console app verification completes.",
            )}
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {connected ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            onClick={disconnect}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2Off className="h-4 w-4" />
            )}
            {t("Putuskan", "Disconnect")}
          </Button>
        ) : (
          <Button type="button" size="sm" className="h-10" disabled>
            <Calendar className="h-4 w-4" />
            {t("Hubungkan Google Calendar (Soon)", "Connect Google Calendar (Soon)")}
          </Button>
        )}
      </div>
    </div>
    </>
  );
}
