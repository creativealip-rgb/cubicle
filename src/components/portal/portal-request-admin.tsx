"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { approveMeetingRequest, counterProposeMeetingRequest, rejectMeetingRequest } from "@/lib/actions/portal-requests";
import { useT } from "@/lib/i18n-client";

type RequestRow = {
  id: string;
  title: string;
  description: string | null;
  type: "document" | "approval" | "info" | "other";
  status: string;
  dueDate: string | null;
  projectId: string | null;
  meetingStartTime?: Date | string | null;
  meetingDurationMinutes?: number | null;
  meetingTimezone?: string | null;
  meetingStatus?: "requested" | "counter_proposed" | "approved" | "rejected" | null;
};

type ProjectOption = { id: string; name: string };

export function PortalRequestAdmin({
  clientId,
  initialRequests,
  projects,
}: {
  clientId: string;
  initialRequests: RequestRow[];
  projects: ProjectOption[];
}) {
  const { t } = useT();
  const [requests, setRequests] = useState(initialRequests);
  const [loading, setLoading] = useState(false);
  const [meetingDialog, setMeetingDialog] = useState<{ mode: "reschedule" | "reject"; request: RequestRow } | null>(null);
  const [schedule, setSchedule] = useState({ date: "", time: "09:00", duration: "60", timezone: "Asia/Jakarta", note: "" });
  const [rejectionReason, setRejectionReason] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "document" as RequestRow["type"],
    dueDate: "",
    projectId: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/portal-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: form.title,
          description: form.description || undefined,
          type: form.type,
          dueDate: form.dueDate || undefined,
          projectId: form.projectId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      const row = data.row;
      setRequests((prev) => [row as RequestRow, ...prev]);
      setForm({ title: "", description: "", type: "document", dueDate: "", projectId: "" });
      toast.success(t("Portal request dibuat", "Portal request created"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal membuat request", "Failed to create request"));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(requestId: string, status: "pending" | "completed" | "cancelled") {
    setLoading(true);
    try {
      const res = await fetch("/api/portal-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setRequests((prev) => prev.map((r) => r.id === requestId ? { ...r, status } : r));
      toast.success(t(`Status diperbarui ke ${status}`, `Status updated to ${status}`));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal memperbarui status", "Failed to update status"));
    } finally {
      setLoading(false);
    }
  }

  function openMeetingDialog(request: RequestRow, mode: "reschedule" | "reject") {
    const start = request.meetingStartTime ? new Date(request.meetingStartTime) : null;
    if (mode === "reschedule") {
      setSchedule({
        date: request.dueDate || (start ? start.toISOString().slice(0, 10) : ""),
        time: start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : "09:00",
        duration: String(request.meetingDurationMinutes || 60),
        timezone: request.meetingTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
        note: t("Usulan jadwal baru dari tim", "New schedule proposal from the team"),
      });
    } else {
      setRejectionReason("");
    }
    setMeetingDialog({ mode, request });
  }

  async function approveMeeting(request: RequestRow) {
    setLoading(true);
    try {
      await approveMeetingRequest(request.id);
      toast.success(t("Meeting disetujui", "Meeting approved"));
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal memproses meeting", "Failed to process meeting"));
    } finally {
      setLoading(false);
    }
  }

  async function submitMeetingDialog(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingDialog) return;
    setLoading(true);
    try {
      if (meetingDialog.mode === "reject") {
        if (!rejectionReason.trim()) throw new Error(t("Alasan penolakan wajib diisi", "Rejection reason is required"));
        await rejectMeetingRequest(meetingDialog.request.id, rejectionReason.trim());
        toast.success(t("Meeting ditolak", "Meeting rejected"));
      } else {
        await counterProposeMeetingRequest({
          requestId: meetingDialog.request.id,
          date: schedule.date,
          time: schedule.time,
          durationMinutes: Number(schedule.duration),
          timezone: schedule.timezone,
          note: schedule.note.trim() || t("Usulan jadwal baru dari tim", "New schedule proposal from the team"),
        });
        toast.success(t("Jadwal baru dikirim ke klien", "New schedule sent to client"));
      }
      setMeetingDialog(null);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal memproses keputusan meeting", "Failed to process meeting decision"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-title">{t("Judul", "Title")}</Label>
            <Input
              id="request-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder={t("Kirim logo / approve desain", "Send logo / approve design")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>{t("Tipe", "Type")}</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as RequestRow["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document">{t("Dokumen", "Document")}</SelectItem>
                <SelectItem value="approval">{t("Persetujuan", "Approval")}</SelectItem>
                <SelectItem value="info">{t("Informasi", "Info")}</SelectItem>
                <SelectItem value="other">{t("Lainnya", "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-due-date">{t("Tenggat Waktu", "Due date")}</Label>
            <Input id="request-due-date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>{t("Proyek", "Project")}</Label>
            <Select value={form.projectId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder={t("Opsional proyek", "Optional project")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("Tanpa proyek", "No project")}</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-description">{t("Deskripsi", "Description")}</Label>
          <Textarea
            id="request-description"
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder={t("Detail instruksi untuk klien...", "Detailed instructions for client...")}
          />
        </div>
        <LoadingButton type="submit" loading={loading} loadingText={t("Menyimpan...", "Saving...")}>
          {t("Tambah Permintaan", "Add request")}
        </LoadingButton>
      </form>

      <div className="space-y-2">
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Belum ada request untuk klien ini.", "No requests for this client yet.")}</p>
        ) : (
          requests.map((r) => (
            <div key={r.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{r.title}</span>
                  <span className="text-xs uppercase text-muted-foreground">({r.type})</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs">{r.status}</span>
                  {r.meetingStatus && (
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs text-primary">
                      {t("Meeting:", "Meeting:")} {r.meetingStatus}
                    </span>
                  )}
                </div>
                {r.description && <p className="text-xs text-muted-foreground">{r.description}</p>}
                {r.meetingStartTime && (
                  <p className="text-xs text-primary">
                    {t("Jadwal:", "Schedule:")} {new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: r.meetingTimezone || undefined }).format(new Date(r.meetingStartTime))} ({r.meetingDurationMinutes || 60} {t("menit", "mins")})
                  </p>
                )}
                {r.dueDate && <p className="text-xs text-muted-foreground">{t("Tenggat:", "Due:")} {r.dueDate}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {r.meetingStatus === "requested" && (
                  <>
                    <Button size="sm" variant="default" disabled={loading} onClick={() => approveMeeting(r)}>
                      {t("Setujui Jadwal", "Approve Schedule")}
                    </Button>
                    <Button size="sm" variant="outline" disabled={loading} onClick={() => openMeetingDialog(r, "reschedule")}>
                      {t("Atur Ulang", "Reschedule")}
                    </Button>
                    <Button size="sm" variant="destructive" disabled={loading} onClick={() => openMeetingDialog(r, "reject")}>
                      {t("Tolak", "Reject")}
                    </Button>
                  </>
                )}
                {r.status === "pending" && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(r.id, "completed")}>
                    {t("Tandai Selesai", "Mark Completed")}
                  </Button>
                )}
                {r.status !== "cancelled" && (
                  <Button size="sm" variant="ghost" disabled={loading} onClick={() => updateStatus(r.id, "cancelled")}>
                    {t("Batalkan", "Cancel")}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={!!meetingDialog} onOpenChange={(open) => !open && setMeetingDialog(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {meetingDialog?.mode === "reject" ? t("Tolak Permintaan Pertemuan", "Reject Meeting Request") : t("Usulkan Jadwal Baru", "Propose New Schedule")}
            </DialogTitle>
            <DialogDescription>
              {meetingDialog?.mode === "reject"
                ? t("Beri alasan penolakan untuk dikirimkan ke klien.", "Provide a rejection reason to be sent to the client.")
                : t("Kirimkan tanggal/jam alternatif agar klien bisa meninjau ulang.", "Send an alternative date/time for the client to review.")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMeetingDialog}>
            {meetingDialog?.mode === "reject" ? (
              <div className="py-5">
                <Label htmlFor="meeting-rejection">{t("Alasan penolakan", "Rejection reason")}</Label>
                <Textarea
                  id="meeting-rejection"
                  className="mt-2 min-h-28"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder={t("Contoh: Tim belum tersedia pada jadwal tersebut...", "e.g. Team unavailable at that time...")}
                  required
                  autoFocus
                />
              </div>
            ) : (
              <div className="grid gap-4 py-5">
                {meetingDialog?.request.meetingStartTime && (
                  <div className="rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t("Jadwal sebelumnya", "Previous schedule")}</p>
                    <p className="mt-1 font-medium">{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: meetingDialog.request.meetingTimezone || undefined }).format(new Date(meetingDialog.request.meetingStartTime))}</p>
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="meeting-date">{t("Tanggal baru", "New date")}</Label>
                    <Input id="meeting-date" type="date" value={schedule.date} onChange={(e) => setSchedule((p) => ({ ...p, date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-time">{t("Jam mulai", "Start time")}</Label>
                    <Input id="meeting-time" type="time" value={schedule.time} onChange={(e) => setSchedule((p) => ({ ...p, time: e.target.value }))} required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{t("Durasi", "Duration")}</Label>
                    <Select value={schedule.duration} onValueChange={(duration) => setSchedule((p) => ({ ...p, duration }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[30, 45, 60, 90, 120].map((minutes) => (
                          <SelectItem key={minutes} value={String(minutes)}>{minutes} {t("menit", "mins")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="meeting-timezone">{t("Zona waktu", "Timezone")}</Label>
                    <Input id="meeting-timezone" value={schedule.timezone} onChange={(e) => setSchedule((p) => ({ ...p, timezone: e.target.value }))} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meeting-note">{t("Catatan untuk klien", "Note for client")}</Label>
                  <Textarea id="meeting-note" value={schedule.note} onChange={(e) => setSchedule((p) => ({ ...p, note: e.target.value }))} placeholder={t("Jelaskan alasan atau konteks perubahan jadwal...", "Explain the reason or context for the schedule change...")} />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setMeetingDialog(null)}>{t("Batal", "Cancel")}</Button>
              <Button type="submit" variant={meetingDialog?.mode === "reject" ? "destructive" : "default"} disabled={loading || (meetingDialog?.mode === "reject" ? !rejectionReason.trim() : !schedule.date || !schedule.time || !schedule.timezone)}>
                {loading ? t("Memproses...", "Processing...") : meetingDialog?.mode === "reject" ? t("Tolak pertemuan", "Reject meeting") : t("Kirim usulan jadwal", "Send schedule proposal")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
