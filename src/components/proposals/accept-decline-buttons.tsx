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
  const [acceptOpen, setAcceptOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleAccept() {
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
        onClick={() => setAcceptOpen(true)}
        disabled={loading !== null}
        className="bg-emerald-600 hover:bg-emerald-700"
      >
        <Check className="h-4 w-4 mr-2" />
        {loading === "accept" ? t("Menyetujui...", "Accepting...") : t("Setujui proposal", "Accept proposal")}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setDeclineOpen(true)}
        disabled={loading !== null}
      >
        <X className="h-4 w-4 mr-2" />
        {t("Tolak", "Decline")}
      </Button>
      <Dialog open={acceptOpen} onOpenChange={(open) => !loading && setAcceptOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Setujui proposal?", "Accept proposal?")}</DialogTitle>
            <DialogDescription>
              {t("Persetujuan Anda mengonfirmasi scope, harga, dan ketentuan. Setelah itu kami menyiapkan project dan invoice pembayaran awal.", "Your approval confirms the scope, pricing, and terms. We will then prepare the project setup and initial payment invoice.")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAcceptOpen(false)} disabled={loading === "accept"}>{t("Batal", "Cancel")}</Button>
            <Button onClick={handleAccept} disabled={loading === "accept"} className="bg-emerald-600 hover:bg-emerald-700">
              {loading === "accept" ? t("Menyetujui...", "Accepting...") : t("Konfirmasi persetujuan", "Confirm approval")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
