"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { voidInvoice } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function VoidInvoiceButton({
  invoiceId,
  disabled,
}: {
  invoiceId: string;
  disabled?: boolean;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVoid() {
    if (!reason.trim()) {
      toast.error(t("Alasan wajib diisi", "Reason is required"));
      return;
    }
    setLoading(true);
    try {
      await voidInvoice({ invoiceId, reason: reason.trim() });
      toast.success(t("Invoice dibatalkan", "Invoice voided"));
      setOpen(false);
      refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("Gagal membatalkan invoice", "Failed to void invoice");
      toast.error(msg);
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1 text-destructive hover:text-destructive">
          <Ban className="h-4 w-4" />
          {t("Batalkan Invoice", "Void invoice")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Batalkan invoice ini?", "Void this invoice?")}</DialogTitle>
          <DialogDescription>
            {t(
              "Invoice akan ditandai Dibatalkan. Item dan riwayat pembayaran tetap tersimpan untuk audit. Aksi ini tidak bisa dibatalkan.",
              "The invoice will be marked as cancelled. Line items and payment history are kept for audit. This action cannot be undone.",
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="void-reason">{t("Alasan pembatalan *", "Void reason *")}</Label>
          <Textarea
            id="void-reason"
            rows={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={loading}
            placeholder={t("Contoh: pembayaran ganda / dibatalkan klien", "e.g. duplicate payment / cancelled by client")}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
          <LoadingButton variant="destructive" onClick={handleVoid} loading={loading} loadingText={t("Membatalkan…", "Voiding…")} disabled={!reason.trim()}>
            {t("Batalkan Invoice", "Void invoice")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
