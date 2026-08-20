"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link2,
  Link2Off,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createClientGoogleEventAction,
  deleteClientGoogleEventAction,
  disconnectClientGoogleCalendarAction,
  generateClientGoogleCalendarInvite,
  updateClientGoogleEventAction,
} from "@/lib/actions/client-google-calendar";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";

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

const PAGE_SIZE = 10;

type EventFormState = {
  title: string;
  description: string;
  location: string;
  start: string;
  end: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(value: string | Date | null | undefined) {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T09:00`;
  }
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultFormValues(): EventFormState {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return {
    title: "",
    description: "",
    location: "",
    start: toDatetimeLocalValue(start),
    end: toDatetimeLocalValue(end),
  };
}

function formFromEvent(event: ClientGcalEvent): EventFormState {
  return {
    title: event.title || "",
    description: event.description || "",
    location: event.location || "",
    start: toDatetimeLocalValue(event.start),
    end: toDatetimeLocalValue(event.end),
  };
}

function localInputToIso(value: string) {
  // datetime-local is local wall time; Date parses as local then toISOString
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error("Waktu tidak valid");
  return d.toISOString();
}

function formatWhen(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
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
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EventFormState>(defaultFormValues);

  useEffect(() => {
    setPage(1);
  }, [events.length, clientId]);

  const badge = useMemo(() => {
    if (connected) return { label: "Terhubung", variant: "default" as const };
    if (pendingInvite || inviteUrl)
      return { label: "Menunggu klien", variant: "secondary" as const };
    if (!configured)
      return { label: "Belum dikonfigurasi", variant: "secondary" as const };
    return { label: "Belum terhubung", variant: "secondary" as const };
  }, [connected, pendingInvite, inviteUrl, configured]);

  const totalPages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageEvents = events.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleGenerateInvite() {
    setLoading(true);
    try {
      const result = await generateClientGoogleCalendarInvite(clientId);
      setInviteUrl(result.inviteUrl);
      setInviteExpiresAt(result.expiresAt);
      toast.success("Link undangan dibuat. Kirim ke klien.");
      refresh();
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
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal putus koneksi");
    } finally {
      setLoading(false);
    }
  }

  function openCreateForm() {
    setEditingId(null);
    setForm(defaultFormValues());
    setShowForm(true);
  }

  function openEditForm(event: ClientGcalEvent) {
    setEditingId(event.id);
    setForm(formFromEvent(event));
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(defaultFormValues());
  }

  async function handleSaveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("Judul wajib diisi", "Title is required"));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        start: localInputToIso(form.start),
        end: localInputToIso(form.end),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
      };
      if (editingId) {
        await updateClientGoogleEventAction(clientId, editingId, payload);
        toast.success(t("Event diupdate di Google Calendar klien", "Event updated in the client's Google Calendar"));
      } else {
        await createClientGoogleEventAction(clientId, payload);
        toast.success(t("Event dibuat di Google Calendar klien", "Event created in the client's Google Calendar"));
      }
      closeForm();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal simpan event");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEvent(event: ClientGcalEvent) {
    if (!confirm(`Hapus event "${event.title}" dari Google Calendar klien?`)) return;
    setLoading(true);
    try {
      await deleteClientGoogleEventAction(clientId, event.id);
      toast.success(t("Event dihapus", "Event deleted"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal hapus event");
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
              {t("Google Calendar Klien", "Client Google Calendar")}{" "}
              <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-300">
                Soon
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={badge.variant}>{badge.label}</Badge>
              {status === "error" ? (
                <Badge variant="destructive">Error</Badge>
              ) : null}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("Integrasi Google Calendar klien dikunci sementara menunggu verifikasi aplikasi oleh Google.", "Client Google Calendar integration is temporarily locked pending Google verification.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900">
            <p className="font-medium">
              {t("Fitur Belum Diverifikasi Google (Soon)", "Feature Pending Google Verification (Soon)")}
            </p>
            <p className="mt-1">
              {t(
                "Integrasi Google Calendar untuk klien belum dapat dihubungkan hingga proses verifikasi selesai.",
                "Google Calendar integration for clients cannot be connected until verification completes.",
              )}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {!connected ? (
              <Button
                type="button"
                size="sm"
                disabled
              >
                <Link2 className="h-4 w-4" />
                {t("Hubungkan Google Calendar klien (Soon)", "Connect client Google Calendar (Soon)")}
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  size="sm"
                  onClick={openCreateForm}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4" />
                  {t("Buat event", "Create event")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => refresh()}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  {t("Refresh event", "Refresh events")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateInvite}
                  disabled={loading}
                >
                  <Link2 className="h-4 w-4" />
                  {t("Re-connect link", "Reconnect link")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2Off className="h-4 w-4" />
                  )}
                  {t("Putuskan", "Disconnect")}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {showForm && connected ? (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {editingId ? t("Edit event", "Edit event") : t("Buat event baru", "Create new event")}
              </CardTitle>
              <Button type="button" size="sm" variant="ghost" onClick={closeForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("Langsung masuk Google Calendar klien", "Added directly to the client's Google Calendar")} ({email || t("terhubung", "connected")} ).
            </p>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={handleSaveEvent}>
              <div className="space-y-1.5">
                <Label htmlFor="gcal-title">{t("Judul", "Title")}</Label>
                <Input
                  id="gcal-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t("Mis. Briefing 07.00–08.00", "E.g. Briefing 07:00–08:00")}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="gcal-start">{t("Mulai", "Start")}</Label>
                  <Input
                    id="gcal-start"
                    type="datetime-local"
                    value={form.start}
                    onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gcal-end">{t("Selesai", "End")}</Label>
                  <Input
                    id="gcal-end"
                    type="datetime-local"
                    value={form.end}
                    onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gcal-location">{t("Lokasi (opsional)", "Location (optional)")}</Label>
                <Input
                  id="gcal-location"
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  placeholder={t("Zoom / Kantor / dll", "Zoom / Office / etc.")}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gcal-desc">{t("Catatan (opsional)", "Notes (optional)")}</Label>
                <Textarea
                  id="gcal-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder={t("Agenda / yang dikerjakan di slot ini", "Agenda / what will be done in this slot")}
                  rows={3}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : null}
                  {editingId ? t("Simpan perubahan", "Save changes") : t("Buat di Google Calendar", "Create in Google Calendar")}
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={closeForm}>
                  {t("Batal", "Cancel")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">{t("Event Google Calendar klien", "Client Google Calendar events")}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t("7 hari ke belakang · 60 hari ke depan · max", "7 days back · 60 days ahead · max")} {PAGE_SIZE}/{t("halaman", "page")}
              </p>
            </div>
            {connected && events.length > 0 ? (
              <p className="text-xs text-muted-foreground">
                {events.length} {t("event", "events")} · {t("halaman", "page")} {safePage}/{totalPages}
              </p>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {!connected ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("Hubungkan kalender klien dulu untuk lihat / atur event.", "Connect the client calendar first to view/manage events.")}
            </p>
          ) : eventsError ? (
            <p className="text-sm text-destructive">{eventsError}</p>
          ) : events.length === 0 ? (
            <div className="space-y-3 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tidak ada event di rentang ini.
              </p>
              <Button type="button" size="sm" onClick={openCreateForm}>
                <Plus className="h-4 w-4" />
                Buat event pertama
              </Button>
            </div>
          ) : (
            <>
              {pageEvents.map((ev) => (
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
                    {ev.description ? (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {ev.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {ev.status ? (
                      <Badge variant="outline" className="text-[10px]">
                        {ev.status}
                      </Badge>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => openEditForm(ev)}
                      disabled={loading}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-destructive"
                      onClick={() => handleDeleteEvent(ev)}
                      disabled={loading}
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {ev.htmlLink ? (
                      <Button asChild size="sm" variant="ghost" className="h-8 w-8 p-0">
                        <a href={ev.htmlLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}

              {totalPages > 1 ? (
                <div className="flex items-center justify-between gap-2 border-t pt-3">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Sebelumnya
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Halaman {safePage} / {totalPages}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Berikutnya
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Jadwal Cubiqlo (client)</CardTitle>
          <p className="text-sm text-muted-foreground">
            Meeting / appointment Cubiqlo untuk klien ini (booking form). Bukan campur event Google di atas.
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
