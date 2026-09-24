"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Calendar, Check, X, Clock, User, AlertCircle, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { approveMeetingRequest, rejectMeetingRequest } from "@/lib/actions/portal-requests";
import { useT } from "@/lib/i18n-client";

export type PendingMeetingRequestItem = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string | null;
  projectName?: string | null;
  title: string;
  description?: string | null;
  preferredDate?: string | null;
  meetingStartTime?: Date | string | null;
  meetingDurationMinutes?: number | null;
  createdAt: Date | string;
};

export function PendingMeetingRequestsPanel({
  requests,
  locale = "id-ID",
}: {
  requests: PendingMeetingRequestItem[];
  locale?: string;
}) {
  const { t, lang } = useT();
  const { refresh } = useAppTransition();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [, startTransition] = useTransition();

  if (requests.length === 0) return null;

  function handleApprove(req: PendingMeetingRequestItem) {
    setLoadingId(req.id);
    startTransition(async () => {
      try {
        await approveMeetingRequest(req.id);
        toast.success(t("Permintaan meeting disetujui & masuk jadwal", "Meeting request approved and added to schedule"));
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("Gagal menyetujui meeting", "Failed to approve meeting"));
      } finally {
        setLoadingId(null);
      }
    });
  }

  function handleReject(id: string) {
    if (!rejectReason.trim()) {
      toast.error(t("Mohon masukkan alasan penolakan", "Please provide a rejection reason"));
      return;
    }
    setLoadingId(id);
    startTransition(async () => {
      try {
        await rejectMeetingRequest(id, rejectReason.trim());
        toast.success(t("Permintaan meeting ditolak", "Meeting request declined"));
        setRejectingId(null);
        setRejectReason("");
        refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t("Gagal menolak meeting", "Failed to decline meeting"));
      } finally {
        setLoadingId(null);
      }
    });
  }

  return (
    <Card className="rounded-2xl border-amber-500/30 bg-amber-500/[0.03] shadow-xs overflow-hidden">
      <CardHeader className="p-3.5 sm:p-4 border-b border-amber-500/20 bg-amber-500/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold text-foreground">
                {t("Permintaan Meeting Masuk", "Incoming Meeting Requests")}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {t(
                  "Klien meminta jadwal meeting melalui portal klien. Setujui untuk memasukkan ke kalender.",
                  "Clients requested meeting schedule via client portal. Approve to add to calendar."
                )}
              </p>
            </div>
          </div>
          <Badge className="bg-amber-500 text-white hover:bg-amber-600 font-bold px-2 py-0.5 text-xs">
            {requests.length} {t("Menunggu", "Pending")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0 divide-y divide-border/60">
        {requests.map((req) => {
          const startTime = req.meetingStartTime ? new Date(req.meetingStartTime) : null;
          const formattedDate = startTime
            ? startTime.toLocaleDateString(lang === "en" ? "en-US" : locale, {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : req.preferredDate || t("Sesuai kesepakatan", "Flexible / As agreed");

          const formattedTime = startTime
            ? startTime.toLocaleTimeString(lang === "en" ? "en-US" : locale, {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              })
            : null;

          const cleanDesc = (req.description || "")
            .replace(/^\[CLIENT_ORIGIN (report|meeting)\]\n?/, "")
            .replace(/Preferred date: [^\n]+\n?/, "")
            .trim();

          const isLoading = loadingId === req.id;

          return (
            <div key={req.id} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card/40">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{req.clientName}</span>
                  {req.projectName ? (
                    <Badge variant="outline" className="text-[10px] h-5 font-semibold">
                      {req.projectName}
                    </Badge>
                  ) : null}
                  <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium border-amber-500/20">
                    {t("Request Portal", "Portal Request")}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {formattedDate} {formattedTime ? `· ${formattedTime} (${req.meetingDurationMinutes ?? 30}m)` : ""}
                  </span>
                  {req.clientEmail ? <span>· {req.clientEmail}</span> : null}
                </div>

                {cleanDesc ? (
                  <p className="text-xs text-muted-foreground bg-muted/40 p-2 rounded-lg mt-1.5 flex items-start gap-1.5 border border-border/50">
                    <MessageSquare className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                    <span className="italic">"{cleanDesc}"</span>
                  </p>
                ) : null}

                {rejectingId === req.id ? (
                  <div className="mt-2.5 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder={t("Alasan penolakan...", "Reason for declining...")}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1.5 rounded-md border border-border bg-background focus:outline-hidden focus:ring-1 focus:ring-primary"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      disabled={isLoading}
                      onClick={() => handleReject(req.id)}
                    >
                      {isLoading ? t("Menolak...", "Declining...") : t("Kirim Penolakan", "Confirm Decline")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs"
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                    >
                      {t("Batal", "Cancel")}
                    </Button>
                  </div>
                ) : null}
              </div>

              {rejectingId !== req.id ? (
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <Button
                    size="sm"
                    className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    disabled={isLoading}
                    onClick={() => handleApprove(req)}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {isLoading ? t("Memproses...", "Processing...") : t("Setujui Jadwal", "Approve Schedule")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                    disabled={isLoading}
                    onClick={() => setRejectingId(req.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                    {t("Tolak", "Decline")}
                  </Button>
                </div>
              ) : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
