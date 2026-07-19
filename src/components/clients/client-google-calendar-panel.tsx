"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  disconnectClientGoogleCalendarAction,
  generateClientGoogleCalendarInvite,
} from "@/lib/actions/client-google-calendar";
import { useRouter } from "next/navigation";

export type ClientGcalEvent = {
  id: string;
  title: string;
  description: string | null;
  start: string | null;
  end: string | null;
  htmlLink: string | null;
  status: string | null;
  location: string | null;
};

type Props = {
  clientId: string;
  configured: boolean;
  connected: boolean;
  pendingInvite: boolean;
  email: string | null;
  status: string | null;
  lastError: string | null;
  connectedAt: string | null;
  events: ClientGcalEvent[];
  eventsError: string | null;
  appointments: Array<{
    id: string;
    title: string;
    startTime: string | Date;
    endTime: string | Date;
    status: string;
    attendeeName: string | null;
    attendeeEmail: string | null;
  }>;
};

function formatWhen(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  // all-day dates come as YYYY-MM-DD
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return d.toLocaleDateString("id-ID", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return d.toLocaleString("id-ID", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ClientGoogleCalendarPanel({
  clientId,
  configured,
  connected,
  pendingInvite,
  email,
  status,
  lastError,
  connectedAt,
  events,
  eventsError,
  appointments,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);

  const badge = useMemo(() => {
    if (connected) return { label: "Terhubung", variant: "default" as const };
    if (pendingInvite || inviteUrl)
      return { label: "Menunggu klien", variant: "secondary" as const };
    if (!configured)
      return { label: "Belum dikonfigurasi", variant: "secondary" as const };
    return { label: "Belum terhubung", variant: "secondary" as const };
  }, [connected, pendingInvite, inviteUrl, configured]);

  async function handleGenerateInvite() {
    setLoading(true);
    try {
      const result = await generateClientGoogleCalendarInvite(clientId);
      setInviteUrl(result.inviteUrl);
      setInviteExpiresAt(result.expiresAt);
      toast.success("Link undangan dibuat. Kirim ke klien.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal buat link");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link undangan disalin");
  }

  async function handleDisconnect() {
    setLoading(true);
    try {
      await disconnectClientGoogleCalendarAction(clientId);
      setInviteUrl(null);
      setInviteExpiresAt(null);
      toast.success("Google Calendar klien diputus");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal putus koneksi");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Google Calendar Klien
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {status === "error" ? (
                <Badge variant="destructive">Error</Badge>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Terpisah dari kalender kamu. Klien klik link undangan → login Google → allow.
            Event klien tampil di sini, bukan di Calendar utama.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {connected ? (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                <div>
                  <p className="font-medium">Kalender klien terhubung</p>
                  <p className="text-muted-foreground">
                    {email || "Akun Google klien"}
                  </p>
                  {connectedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Terhubung: {formatWhen(connectedAt)}
                    </p>
                  ) : null}
                  {lastError ? (
                    <p className="mt-1 text-xs text-destructive">{lastError}</p>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              {!configured ? (
                <p>
                  Google OAuth server belum dikonfigurasi. Hubungi admin Cubiqlo.
                </p>
              ) : (
                <p>
                  Generate link undangan, kirim ke klien (email/WA). Klien connect
                  Google Calendar mereka sendiri — tanpa login Cubiqlo.
                </p>
              )}
            </div>
          )}

          {inviteUrl ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Link undangan
              </p>
              <code className="block break-all rounded bg-muted px-2 py-1 text-xs">
                {inviteUrl}
              </code>
              {inviteExpiresAt ? (
                <p className="text-xs text-muted-foreground">
                  Berlaku sampai {formatWhen(inviteExpiresAt)}
                </p>
              ) : null}
              <Button type="button" size="sm" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                Salin link
              </Button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!connected ? (
              <Button
                type="button"
                size="sm"
                onClick={handleGenerateInvite}
                disabled={loading || !configured}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                {inviteUrl || pendingInvite
                  ? "Generate ulang link"
                  : "Hubungkan Google Calendar klien"}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.refresh()}
                  disabled={loading}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh event
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateInvite}
                  disabled={loading}
                >
                  <Link2 className="mr-2 h-4 w-4" />
                  Re-connect link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Link2Off className="mr-2 h-4 w-4" />
                  )}
                  Putuskan
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Event Google Calendar klien</CardTitle>
          <p className="text-sm text-muted-foreground">
            7 hari ke belakang · 60 hari ke depan
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connected ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Hubungkan kalender klien dulu untuk lihat event.
            </p>
          ) : eventsError ? (
            <p className="text-sm text-destructive">{eventsError}</p>
          ) : events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Tidak ada event di rentang ini.
            </p>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                className="flex items-start justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatWhen(ev.start)}
                    {ev.end ? ` → ${formatWhen(ev.end)}` : ""}
                  </p>
                  {ev.location ? (
                    <p className="text-xs text-muted-foreground">{ev.location}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {ev.status ? (
                    <Badge variant="outline" className="text-[10px]">
                      {ev.status}
                    </Badge>
                  ) : null}
                  {ev.htmlLink ? (
                    <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                      <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jadwal Cubiqlo (client)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Appointment di Cubiqlo untuk klien ini (bukan campur calendar utama kamu).
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {appointments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada jadwal Cubiqlo.
            </p>
          ) : (
            appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{apt.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {apt.attendeeName ? `${apt.attendeeName} · ` : ""}
                    {formatWhen(apt.startTime)}
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {apt.status}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
