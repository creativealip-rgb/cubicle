"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n-client";
import { Textarea } from "@/components/ui/textarea";
import {
  acceptMeetingCounterProposal,
  completePortalRequest,
  respondPortalRequest,
} from "@/lib/actions/portal-requests";
import {
  cleanPortalRequestDescription,
  partitionPortalRequests,
} from "@/lib/portal-presentation";

interface PortalRequest {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  dueDate: string | null;
  meetingStartTime?: Date | string | null;
  meetingDurationMinutes?: number | null;
  meetingTimezone?: string | null;
  meetingStatus?: string | null;
  meetingResponseNote?: string | null;
}

function parseDecision(
  description: string | null,
): "approved" | "rejected" | null {
  if (!description) return null;
  if (description.includes("[Client APPROVED")) return "approved";
  if (description.includes("[Client REJECTED")) return "rejected";
  return null;
}
export function PortalRequestList({
  requests,
  token,
}: {
  requests: PortalRequest[];
  token: string;
}) {
  const { lang, t } = useT();
  const typeLabels: Record<string, string> = {
    document: t("Dokumen", "Document"),
    approval: t("Persetujuan", "Approval"),
    info: t("Informasi", "Information"),
    other: t("Lainnya", "Other"),
  };
  const [items, setItems] = useState(requests);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});
  async function markDone(id: string) {
    setLoadingId(id);
    try {
      await completePortalRequest({ token, requestId: id });
      setItems((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
      toast.success(t("Request selesai", "Request completed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal", "Failed"));
    } finally {
      setLoadingId(null);
    }
  }
  async function acceptMeeting(id: string) {
    setLoadingId(id);
    try {
      await acceptMeetingCounterProposal(token, id);
      setItems((p) => p.map((r) => r.id === id ? { ...r, status: "completed", meetingStatus: "approved" } : r));
      toast.success(t("Jadwal disetujui dan masuk kalender", "Schedule approved and added to calendar"));
    } catch (e) { toast.error(e instanceof Error ? e.message : t("Gagal", "Failed")); }
    finally { setLoadingId(null); }
  }
  async function decide(id: string, decision: "approved" | "rejected") {
    setLoadingId(id);
    try {
      const row = await respondPortalRequest({
        token,
        requestId: id,
        decision,
        note: noteById[id] || null,
      });
      setItems((p) =>
        p.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "completed",
                description: row.description ?? r.description,
              }
            : r,
        ),
      );
      toast.success(
        decision === "approved"
          ? t("Disetujui", "Approved")
          : t("Permintaan revisi dikirim", "Revision request sent"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal", "Failed"));
    } finally {
      setLoadingId(null);
    }
  }
  async function uploadFile(id: string, file?: File) {
    if (!file) return;
    setLoadingId(id);
    try {
      const form = new FormData();
      form.append("token", token);
      form.append("requestId", id);
      form.append("file", file);
      const res = await fetch("/api/client-portal/requests/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error ?? t("Upload gagal", "Upload failed"));
      setItems((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
      toast.success(t("File berhasil diunggah", "File uploaded successfully"));
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("Upload gagal", "Upload failed"),
      );
    } finally {
      setLoadingId(null);
      if (fileInputs.current[id]) fileInputs.current[id]!.value = "";
    }
  }
  if (!items.length)
    return (
      <p className="text-sm text-muted-foreground">
        {t(
          "Tidak ada request atau pengingat aktif.",
          "No active requests or reminders.",
        )}
      </p>
    );
  const { open, history } = partitionPortalRequests(items);
  const render = (request: PortalRequest) => {
    const done = request.status === "completed",
      decision = parseDecision(request.description),
      approval = request.type === "approval",
      description = cleanPortalRequestDescription(
        request.description?.replace(
          /\n\n---\n\[Client (APPROVED|REJECTED)[\s\S]*$/,
          "",
        ),
        lang,
      );
    return (
      <div
        key={request.id}
        className="flex flex-col gap-3 rounded-lg border bg-background p-3 sm:flex-row sm:items-start"
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${decision === "rejected" ? "bg-red-50 text-red-600" : decision === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"}`}
          >
            {decision === "approved" ? (
              <ThumbsUp className="h-4 w-4" />
            ) : decision === "rejected" ? (
              <XCircle className="h-4 w-4" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium">
                {request.title === "Request Meeting"
                  ? t("Permintaan Pertemuan", "Meeting Request")
                  : request.title === "Request Report"
                    ? t("Permintaan Laporan", "Report Request")
                    : request.title}
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                {done
                  ? decision === "approved"
                    ? t("Disetujui", "Approved")
                    : decision === "rejected"
                      ? t("Revisi diminta", "Revision requested")
                      : t("Selesai", "Completed")
                  : (typeLabels[request.type] ?? request.type)}
              </span>
            </div>
            {description && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {description}
              </p>
            )}
            {request.dueDate && (
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {t("Tenggat", "Due")}{" "}
                {request.dueDate}
              </p>
            )}
            {request.meetingStartTime && (
              <div className="mt-2 rounded-md bg-muted/40 p-2 text-xs">
                <p className="font-medium">{new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: request.meetingTimezone || undefined }).format(new Date(request.meetingStartTime))}</p>
                <p className="text-muted-foreground">{request.meetingDurationMinutes} menit · {request.meetingTimezone}</p>
                {request.meetingResponseNote && <p className="mt-1 text-muted-foreground">{request.meetingResponseNote}</p>}
              </div>
            )}
            {!done && request.meetingStatus === "counter_proposed" && (
              <Button className="mt-3 min-h-11" disabled={loadingId === request.id} onClick={() => acceptMeeting(request.id)}>
                {t("Setujui jadwal", "Approve schedule")}
              </Button>
            )}
            {!done && approval && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={noteById[request.id] || ""}
                  onChange={(e) =>
                    setNoteById((p) => ({ ...p, [request.id]: e.target.value }))
                  }
                  placeholder={t(
                    "Catatan opsional atau detail revisi…",
                    "Optional notes or revision details…",
                  )}
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-11 gap-1.5"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "approved")}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {t("Setujui", "Approve")}
                  </Button>
                  <Button
                    className="min-h-11 gap-1.5 text-red-600"
                    variant="outline"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "rejected")}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {t("Minta revisi", "Request revision")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
        {!done && !approval && request.meetingStatus !== "counter_proposed" && (
          <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
            {request.type === "document" && (
              <>
                <input
                  ref={(n) => {
                    fileInputs.current[request.id] = n;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => uploadFile(request.id, e.target.files?.[0])}
                />
                <Button
                  className="min-h-11"
                  disabled={loadingId === request.id}
                  onClick={() => fileInputs.current[request.id]?.click()}
                >
                  {t("Unggah file", "Upload file")}
                </Button>
              </>
            )}
            <Button
              className="min-h-11"
              variant="outline"
              disabled={loadingId === request.id}
              onClick={() => markDone(request.id)}
            >
              {t("Tandai selesai", "Mark complete")}
            </Button>
          </div>
        )}
      </div>
    );
  };
  return (
    <div className="space-y-3">
      {open.length ? (
        <div className="space-y-2">{open.map(render)}</div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("Semua request sudah selesai.", "All requests are complete.")}
        </p>
      )}
      {history.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed px-3 text-sm text-muted-foreground hover:bg-muted/30"
          >
            {showHistory ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            {t("Riwayat permintaan", "Request history")} ({history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">{history.map(render)}</div>
          )}
        </div>
      )}
    </div>
  );
}
