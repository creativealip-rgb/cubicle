"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Inbox,
  ThumbsDown,
  ThumbsUp,
  XCircle,
  PlusCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      setItems((p) =>
        p.map((r) =>
          r.id === id
            ? { ...r, status: "completed", meetingStatus: "approved" }
            : r,
        ),
      );
      toast.success(
        t(
          "Jadwal disetujui dan masuk kalender",
          "Schedule approved and added to calendar",
        ),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal", "Failed"));
    } finally {
      setLoadingId(null);
    }
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

  async function uploadFile(id: string, file: File | undefined) {
    if (!file) return;
    setLoadingId(id);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      fd.append("requestId", id);
      const res = await fetch("/api/portal-requests/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(t("Upload gagal", "Upload failed"));
      await completePortalRequest({ token, requestId: id });
      setItems((p) =>
        p.map((r) => (r.id === id ? { ...r, status: "completed" } : r)),
      );
      toast.success(
        t("File berhasil diunggah", "File uploaded successfully"),
      );
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : t("Upload gagal", "Upload failed"),
      );
    } finally {
      setLoadingId(null);
      if (fileInputs.current[id]) fileInputs.current[id]!.value = "";
    }
  }

  if (!items.length) {
    return (
      <Card className="border-dashed border-border/80 bg-card/60 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 mb-3.5">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-foreground">
            {t("Belum Ada Permintaan Aktif", "No Active Requests")}
          </h3>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            {t(
              "Semua permintaan selesai atau belum ada pengajuan baru. Gunakan tombol di atas untuk mengajukan kebutuhan tugas atau meeting.",
              "All requests are completed or none submitted yet. Use the action buttons above to submit a task request or schedule a meeting.",
            )}
          </p>
        </CardContent>
      </Card>
    );
  }

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
        className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card p-4 shadow-2xs sm:flex-row sm:items-start"
      >
        <div className="flex min-w-0 flex-1 gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
              decision === "rejected"
                ? "bg-red-500/10 text-red-600 dark:text-red-400"
                : decision === "approved"
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400"
            }`}
          >
            {decision === "approved" ? (
              <ThumbsUp className="h-4 w-4" />
            ) : decision === "rejected" ? (
              <ThumbsDown className="h-4 w-4" />
            ) : done ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            ) : approval ? (
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            ) : (
              <FileText className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-sm text-foreground">
                {request.title}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  done
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}
              >
                {done
                  ? t("Selesai", "Completed")
                  : t("Menunggu", "Pending")}
              </span>
            </div>
            {description && (
              <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">
                {description}
              </p>
            )}
            {request.dueDate && !done && (
              <p className="mt-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                {t("Batas waktu:", "Due date:")} {request.dueDate}
              </p>
            )}

            {/* Meeting Schedule Status Box */}
            {request.meetingStartTime && (
              <div className="mt-2.5 rounded-xl border border-border/80 bg-muted/30 p-3 text-xs">
                <p className="font-medium text-foreground">
                  {t("Jadwal:", "Schedule:")}{" "}
                  {new Date(request.meetingStartTime).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
                    dateStyle: "full",
                    timeStyle: "short",
                  })}{" "}
                  ({request.meetingDurationMinutes || 30} min)
                </p>
                {request.meetingStatus === "counter_proposed" && (
                  <div className="mt-2 space-y-2">
                    <p className="text-amber-600 dark:text-amber-400 font-semibold">
                      {t("Tim menyarankan jadwal baru:", "Team suggested a new time:")}
                    </p>
                    {request.meetingResponseNote && (
                      <p className="italic text-muted-foreground">
                        &ldquo;{request.meetingResponseNote}&rdquo;
                      </p>
                    )}
                    <Button
                      size="sm"
                      disabled={loadingId === request.id}
                      onClick={() => acceptMeeting(request.id)}
                      className="rounded-lg h-8 text-xs font-semibold"
                    >
                      {t("Setujui Jadwal Baru", "Accept New Time")}
                    </Button>
                  </div>
                )}
                {request.meetingStatus === "rejected" && request.meetingResponseNote && (
                  <p className="mt-1 text-red-600 dark:text-red-400">
                    {t("Ditolak:", "Declined:")} {request.meetingResponseNote}
                  </p>
                )}
              </div>
            )}

            {/* Approval Decision Form */}
            {!done && approval && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder={t(
                    "Catatan / alasan (opsional)",
                    "Notes / reason (optional)",
                  )}
                  value={noteById[request.id] || ""}
                  onChange={(e) =>
                    setNoteById((p) => ({
                      ...p,
                      [request.id]: e.target.value,
                    }))
                  }
                  className="text-xs"
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "approved")}
                    className="rounded-lg h-8 text-xs font-semibold"
                  >
                    <ThumbsUp className="mr-1.5 h-3.5 w-3.5" />
                    {t("Setujui", "Approve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={loadingId === request.id}
                    onClick={() => decide(request.id, "rejected")}
                    className="rounded-lg h-8 text-xs font-semibold"
                  >
                    <ThumbsDown className="mr-1.5 h-3.5 w-3.5" />
                    {t("Minta Revisi", "Request Revision")}
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
                  size="sm"
                  disabled={loadingId === request.id}
                  onClick={() => fileInputs.current[request.id]?.click()}
                  className="rounded-lg h-8 text-xs font-semibold"
                >
                  {t("Unggah file", "Upload file")}
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={loadingId === request.id}
              onClick={() => markDone(request.id)}
              className="rounded-lg h-8 text-xs font-semibold"
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
        <div className="space-y-2.5">{open.map(render)}</div>
      ) : (
        <Card className="border-dashed border-border/80 bg-card/60 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-2.5">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <p className="text-xs font-bold text-foreground">
              {t("Semua Request Selesai", "All Requests Completed")}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {t(
                "Tidak ada permintaan yang menunggu tindakan kamu saat ini.",
                "No requests currently pending your action.",
              )}
            </p>
          </CardContent>
        </Card>
      )}

      {history.length > 0 && (
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex min-h-9 w-full items-center justify-between rounded-xl border border-border/80 bg-card/60 px-3.5 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-2">
              {showHistory ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
              {t("Riwayat permintaan", "Request history")}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">
              {history.length}
            </span>
          </button>
          {showHistory && (
            <div className="mt-2.5 space-y-2.5">{history.map(render)}</div>
          )}
        </div>
      )}
    </div>
  );
}
