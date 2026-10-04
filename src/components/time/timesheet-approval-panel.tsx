"use client";
import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { submitWeeklyTimesheet, reviewWeeklyTimesheet } from "@/lib/actions/timesheet-approval";
import { useT } from "@/lib/i18n-client";

export interface ApprovalItem {
  id: string;
  userName: string | null;
  weekStart: string;
  status: string;
  totalMinutes: number;
  billableMinutes: number;
  submitterNote: string | null;
  reviewNote: string | null;
}

export function TimesheetApprovalPanel({
  weekStart,
  current,
  pending = [],
  isOwner,
}: {
  weekStart: string;
  current: ApprovalItem | null;
  pending?: ApprovalItem[];
  isOwner: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [submitterNote, setSubmitterNote] = useState("");
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await submitWeeklyTimesheet({ weekStart, note: submitterNote });
      toast.success(t("Minggu ini dikirim", "Submitted this week"));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal mengirim", "Failed to submit"));
    } finally {
      setBusy(false);
    }
  }

  async function review(id: string, decision: "approved" | "rejected") {
    const note = reviewNotes[id] ?? "";
    if (decision === "rejected" && !note.trim()) {
      toast.error(t("Catatan penolakan wajib diisi", "Rejection note is required"));
      return;
    }
    setBusy(true);
    try {
      await reviewWeeklyTimesheet({ submissionId: id, decision, note });
      toast.success(decision === "approved" ? t("Timesheet disetujui", "Timesheet approved") : t("Timesheet ditolak", "Timesheet rejected"));
      setReviewNotes((currentNotes) => ({ ...currentNotes, [id]: "" }));
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Gagal review", "Review failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="font-medium">{t("Persetujuan minggu ini", "This week's approval")}</p>
            <p className="text-xs text-muted-foreground">{t("Minggu", "Week")} {weekStart}</p>
          </div>
          {current ? <Badge>{current.status}</Badge> : <Badge variant="secondary">{t("draf", "draft")}</Badge>}
        </div>

        {current?.reviewNote && (
          <p className="rounded-md bg-muted p-2 text-sm">
            {t("Catatan reviewer:", "Reviewer note:")} {current.reviewNote}
          </p>
        )}

        {(!current || current.status === "rejected") && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={submitterNote}
              onChange={(e) => setSubmitterNote(e.target.value)}
              placeholder={t("Catatan pengirim (opsional)", "Submitter note (optional)")}
            />
            <Button disabled={busy} onClick={submit}>
              {t("Kirim Minggu Ini", "Submit This Week")}
            </Button>
          </div>
        )}

        {isOwner && pending.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">{t("Tinjau", "Review")}</p>
            {pending.map((item) => (
              <div key={item.id} className="rounded-md border p-3">
                <div className="flex justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{item.userName || t("Anggota", "Member")}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.weekStart} · {(item.totalMinutes / 60).toFixed(1)} {t("jam", "hours")}
                    </p>
                  </div>
                  <Badge>submitted</Badge>
                </div>
                {item.submitterNote && (
                  <p className="mt-2 text-xs">
                    {t("Catatan pengirim:", "Submitter note:")} {item.submitterNote}
                  </p>
                )}
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={reviewNotes[item.id] ?? ""}
                    onChange={(e) =>
                      setReviewNotes((notes) => ({ ...notes, [item.id]: e.target.value }))
                    }
                    placeholder={t("Catatan review", "Review note")}
                  />
                  <Button disabled={busy} onClick={() => review(item.id, "approved")}>
                    {t("Setujui", "Approve")}
                  </Button>
                  <Button disabled={busy} variant="destructive" onClick={() => review(item.id, "rejected")}>
                    {t("Tolak", "Reject")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
