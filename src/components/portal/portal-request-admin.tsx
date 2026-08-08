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
  const [schedule, setSchedule] = useState({ date: "", time: "09:00", duration: "60", timezone: "Asia/Jakarta", note: "Usulan jadwal baru dari tim" });
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
      toast.success("Portal request dibuat");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
      toast.success(`Request ${status}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  function openMeetingDialog(request: RequestRow, mode: "reschedule" | "reject") {
    const start = request.meetingStartTime ? new Date(request.meetingStartTime) : null;
    if (mode === "reschedule") setSchedule({ date: request.dueDate || (start ? start.toISOString().slice(0, 10) : ""), time: start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : "09:00", duration: String(request.meetingDurationMinutes || 60), timezone: request.meetingTimezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta", note: "Usulan jadwal baru dari tim" });
    else setRejectionReason("");
    setMeetingDialog({ mode, request });
  }

  async function approveMeeting(request: RequestRow) {
    setLoading(true);
    try { await approveMeetingRequest(request.id); toast.success("Meeting disetujui"); window.location.reload(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gagal memproses meeting"); }
    finally { setLoading(false); }
  }

  async function submitMeetingDialog(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingDialog) return;
    setLoading(true);
    try {
      if (meetingDialog.mode === "reject") {
        if (!rejectionReason.trim()) throw new Error("Alasan penolakan wajib diisi");
        await rejectMeetingRequest(meetingDialog.request.id, rejectionReason.trim());
        toast.success("Meeting ditolak");
      } else {
        await counterProposeMeetingRequest({ requestId: meetingDialog.request.id, date: schedule.date, time: schedule.time, durationMinutes: Number(schedule.duration), timezone: schedule.timezone, note: schedule.note.trim() || "Usulan jadwal baru dari tim" });
        toast.success("Jadwal baru dikirim ke klien");
      }
      setMeetingDialog(null); window.location.reload();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal memproses meeting"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="request-title">Title</Label>
            <Input id="request-title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Kirim logo / approve desain" required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v as RequestRow["type"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="approval">Approval</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={form.projectId || "none"} onValueChange={(v) => setForm((p) => ({ ...p, projectId: v === "none" ? "" : v }))}>
              <SelectTrigger><SelectValue placeholder="Optional project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="due-date">Due date</Label>
            <Input id="due-date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="request-description">Description</Label>
          <Textarea id="request-description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Detail instruksi untuk klien..." />
        </div>
        <LoadingButton type="submit" loading={loading} loadingText="Saving...">{"Add request"}</LoadingButton>
      </form>

      <div className="space-y-2">
        {requests.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">No portal requests yet</p>
        )}
        {requests.map((request) => {
          const meetingRequest = request.title === "Request Meeting" || Boolean(request.meetingStatus);
          const decision = request.description?.includes("[Client APPROVED")
            ? "approved"
            : request.description?.includes("[Client REJECTED")
              ? "rejected"
              : null;
          const fromClient =
            request.description?.includes("[CLIENT_ORIGIN report]") ||
            request.description?.includes("[CLIENT_ORIGIN meeting]");
          const cleanDesc = (request.description || "")
            .replace(/\n\n---\n\[Client (APPROVED|REJECTED)[\s\S]*$/, "")
            .replace(/^\[CLIENT_ORIGIN (report|meeting)\]\n?/, "");
          return (
            <div key={request.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{request.title}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                    {request.type}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize">
                    {request.status}
                  </span>
                  {fromClient && (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                      From client
                    </span>
                  )}
                  {decision === "approved" && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Client approved
                    </span>
                  )}
                  {decision === "rejected" && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      Changes requested
                    </span>
                  )}
                </div>
                {cleanDesc && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{cleanDesc}</p>}
                {decision && request.description?.includes("Client note:") && (
                  <p className="mt-1 text-xs text-amber-700">
                    {request.description
                      .split("Client note:")
                      .slice(1)
                      .join("Client note:")
                      .trim()
                      .split("\n")[0]}
                  </p>
                )}
                {request.dueDate && (
                  <p className="mt-1 text-xs text-muted-foreground">Due {request.dueDate}</p>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {meetingRequest && request.status === "pending" ? (
                  <>
                    <Button size="sm" disabled={loading || !request.meetingStartTime} onClick={() => approveMeeting(request)}>Setujui</Button>
                    <Button size="sm" variant="outline" disabled={loading} onClick={() => openMeetingDialog(request, "reschedule")}>Ubah jadwal</Button>
                    <Button size="sm" variant="destructive" disabled={loading} onClick={() => openMeetingDialog(request, "reject")}>Tolak</Button>
                  </>
                ) : request.status !== "completed" && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(request.id, "completed")}>
                    Mark done
                  </Button>
                )}
                {request.status !== "cancelled" && (
                  <Button size="sm" variant="outline" disabled={loading} onClick={() => updateStatus(request.id, "cancelled")}>
                    Cancel
                  </Button>
                )}
                {request.status !== "pending" && (
                  <Button size="sm" variant="ghost" disabled={loading} onClick={() => updateStatus(request.id, "pending")}>
                    Reopen
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(meetingDialog)} onOpenChange={(open) => !open && !loading && setMeetingDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <form onSubmit={submitMeetingDialog}>
            <DialogHeader>
              <DialogTitle>{meetingDialog?.mode === "reject" ? t("Tolak Pertemuan", "Reject Meeting") : t("Ubah Jadwal Pertemuan", "Reschedule Meeting")}</DialogTitle>
              <DialogDescription>{meetingDialog?.mode === "reject" ? t("Berikan alasan yang jelas untuk klien.", "Provide a clear reason for the client.") : t("Kirim usulan waktu baru. Klien perlu menyetujuinya sebelum masuk kalender.", "Send a proposed new time. The client needs to approve before it is added to calendar.")}</DialogDescription>
            </DialogHeader>
            {meetingDialog?.mode === "reject" ? (
              <div className="py-5">
                <Label htmlFor="meeting-rejection">Alasan penolakan</Label>
                <Textarea id="meeting-rejection" className="mt-2 min-h-28" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Contoh: Tim belum tersedia pada jadwal tersebut..." required autoFocus />
              </div>
            ) : (
              <div className="grid gap-4 py-5">
                {meetingDialog?.request.meetingStartTime && <div className="rounded-lg bg-muted/50 p-3 text-sm"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Jadwal sebelumnya</p><p className="mt-1 font-medium">{new Intl.DateTimeFormat("id-ID", { dateStyle: "full", timeStyle: "short", timeZone: meetingDialog.request.meetingTimezone || undefined }).format(new Date(meetingDialog.request.meetingStartTime))}</p></div>}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="meeting-date">Tanggal baru</Label><Input id="meeting-date" type="date" value={schedule.date} onChange={(e) => setSchedule((p) => ({ ...p, date: e.target.value }))} required /></div>
                  <div className="space-y-2"><Label htmlFor="meeting-time">Jam mulai</Label><Input id="meeting-time" type="time" value={schedule.time} onChange={(e) => setSchedule((p) => ({ ...p, time: e.target.value }))} required /></div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2"><Label>Durasi</Label><Select value={schedule.duration} onValueChange={(duration) => setSchedule((p) => ({ ...p, duration }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{[30, 45, 60, 90, 120].map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} menit</SelectItem>)}</SelectContent></Select></div>
                  <div className="space-y-2"><Label htmlFor="meeting-timezone">Zona waktu</Label><Input id="meeting-timezone" value={schedule.timezone} onChange={(e) => setSchedule((p) => ({ ...p, timezone: e.target.value }))} required /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="meeting-note">Catatan untuk klien</Label><Textarea id="meeting-note" value={schedule.note} onChange={(e) => setSchedule((p) => ({ ...p, note: e.target.value }))} placeholder="Jelaskan alasan atau konteks perubahan jadwal..." /></div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" disabled={loading} onClick={() => setMeetingDialog(null)}>Batal</Button>
              <Button type="submit" variant={meetingDialog?.mode === "reject" ? "destructive" : "default"} disabled={loading || (meetingDialog?.mode === "reject" ? !rejectionReason.trim() : !schedule.date || !schedule.time || !schedule.timezone)}>{loading ? "Memproses..." : meetingDialog?.mode === "reject" ? "Tolak pertemuan" : "Kirim usulan jadwal"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
