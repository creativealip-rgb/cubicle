"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { acceptProposalPublic, declineProposalPublic } from "@/lib/actions/proposals";

interface AcceptDeclineButtonsProps {
  proposalId: string;
  token: string;
}

export function AcceptDeclineButtons({ proposalId, token }: AcceptDeclineButtonsProps) {
  const { t } = useT();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleAccept() {
    if (!confirm(t("Setujui proposal ini? Proyek akan dibuat dan invoice DP disiapkan.", "Accept this proposal? Project will be created and DP invoice prepared."))) return;
    setLoading("accept");
    try {
      await acceptProposalPublic(proposalId, token);
      toast.success(t("Proposal diterima! Proyek + invoice DP dibuat.", "Proposal accepted! Project + DP invoice created."));
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Terjadi kesalahan", "An error occurred");
      toast.error(msg);
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    try {
      await declineProposalPublic(proposalId, token, reason || undefined);
      toast.success(t("Proposal ditolak", "Proposal declined"));
      setDeclineOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Terjadi kesalahan", "An error occurred");
      toast.error(msg);
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-center">
      <Button
        size="lg"
        onClick={handleAccept}
        disabled={loading !== null}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Check className="h-4 w-4" />
        {loading === "accept" ? t("Menyetujui...", "Accepting...") : t("Setujui proposal", "Accept proposal")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setDeclineOpen(true)}
        disabled={loading !== null}
      >
        <X className="h-4 w-4" />
        {t("Tolak", "Decline")}
      </Button>
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Tolak proposal?", "Decline proposal?")}</DialogTitle>
            <DialogDescription>
              {t("Kalau berkenan, beri tahu alasannya supaya kami bisa memperbaiki. Tindakan ini tidak bisa dibatalkan.", "If willing, let us know why so we can improve. This action cannot be undone.")}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder={t("Alasan (opsional)", "Reason (optional)")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)} disabled={loading === "decline"}>
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleDecline} disabled={loading === "decline"} variant="destructive">
              {loading === "decline" ? t("Menolak...", "Declining...") : t("Konfirmasi tolak", "Confirm decline")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
