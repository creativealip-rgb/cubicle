"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
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
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function handleAccept() {
    if (!confirm("Setujui proposal ini? Proyek akan dibuat dan invoice DP disiapkan.")) return;
    setLoading("accept");
    try {
      await acceptProposalPublic(proposalId, token);
      toast.success("Proposal diterima! Proyek + invoice DP dibuat.");
      // Reload to show accepted state
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
      setLoading(null);
    }
  }

  async function handleDecline() {
    setLoading("decline");
    try {
      await declineProposalPublic(proposalId, token, reason || undefined);
      toast.success("Proposal ditolak");
      setDeclineOpen(false);
      window.location.reload();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
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
        <Check className="h-4 w-4 mr-2" />
        {loading === "accept" ? "Menyetujui..." : "Setujui proposal"}
      </Button>
      <Button
        size="lg"
        variant="outline"
        onClick={() => setDeclineOpen(true)}
        disabled={loading !== null}
      >
        <X className="h-4 w-4 mr-2" />
        Tolak
      </Button>
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak proposal?</DialogTitle>
            <DialogDescription>
              Kalau berkenan, beri tahu alasannya supaya kami bisa memperbaiki. Tindakan ini tidak bisa dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Alasan (opsional)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeclineOpen(false)} disabled={loading === "decline"}>
              Batal
            </Button>
            <Button onClick={handleDecline} disabled={loading === "decline"} variant="destructive">
              {loading === "decline" ? "Menolak..." : "Konfirmasi tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
