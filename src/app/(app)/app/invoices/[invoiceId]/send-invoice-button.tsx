"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Send } from "lucide-react";
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
import { sendInvoiceEmail } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function SendInvoiceButton({
  invoiceId,
  defaultMessage,
  clientEmail,
  defaultFrom,
  defaultTo,
  disabled,
}: {
  invoiceId: string;
  defaultMessage: string;
  clientEmail?: string | null;
  defaultFrom: string;
  defaultTo: string;
  disabled?: boolean;
}) {
  const { refresh } = useAppTransition();
  const { t, lang } = useT();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [attachReport, setAttachReport] = useState(false);
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultTo);

  async function handleSend() {
    if (!message.trim()) {
      toast.error(t("Body pesan wajib diisi", "Message body is required"));
      return;
    }
    if (attachReport && (!from || !to || from > to)) {
      toast.error(t("Rentang tanggal tidak valid", "Invalid date range"));
      return;
    }

    setLoading(true);
    try {
      await sendInvoiceEmail(invoiceId, message, attachReport ? { from, to } : undefined);
      toast.success(t("Invoice terkirim ke email klien", "Invoice sent to client email"));
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengirim invoice", "Failed to send invoice"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (loading) return;
        setOpen(nextOpen);
        if (nextOpen) {
          setMessage(defaultMessage);
          setAttachReport(false);
          setFrom(defaultFrom);
          setTo(defaultTo);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2" disabled={disabled} title={!clientEmail ? t("Email klien belum diisi. Lengkapi email klien di menu Clients agar bisa dikirim.", "Client email is missing. Add client email in Clients menu to send.") : undefined}>
          <Send className="h-4 w-4" />
          {t("Kirim Invoice", "Send invoice")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Kirim invoice", "Send invoice")}</DialogTitle>
          <DialogDescription>
            {t(
              "Periksa penerima dan subjek sebelum mengirim.",
              "Review the recipient and subject before sending."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <label className="block space-y-2">
            <span className="block text-sm font-medium text-foreground">{t("Pesan", "Message")}</span>
            <Textarea
              id="invoice-message"
              rows={6}
              maxLength={10000}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              disabled={loading}
              className="min-h-40 resize-y leading-relaxed font-sans"
              placeholder={t("Pesan tambahan untuk klien...", "Optional message to client...")}
            />
          </label>

          <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
            <div className="space-y-1">
              <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("Penerima", "Recipient")}
              </span>
              <span className="block min-w-0 break-words font-medium">
                {clientEmail || t("Belum ada email klien", "No client email set")}
              </span>
              {!clientEmail && (
                <p className="text-xs text-amber-600 font-medium">
                  ⚠️ {t(
                    "Email klien kosong. Masukkan email di menu Clients atau bagikan via Link/WhatsApp.",
                    "Client email is missing. Set it in Clients menu or share via Link/WhatsApp."
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t pt-2">
              <div className="flex items-start gap-2">
                <input
                  id="attach-detail-report"
                  type="checkbox"
                  checked={attachReport}
                  onChange={(event) => setAttachReport(event.target.checked)}
                  disabled={loading}
                  className="mt-0.5 h-4 w-4 rounded border"
                />
                <Label htmlFor="attach-detail-report" className="cursor-pointer text-xs font-medium leading-5">
                  {t("Lampirkan rincian timesheet/jam kerja", "Attach detail report link")}
                </Label>
              </div>
              {attachReport ? (
                <div className="grid grid-cols-2 gap-3 pl-6 pt-1">
                  <div className="space-y-1">
                    <Label htmlFor="report-from" className="text-xs font-medium">{t("Dari", "From")}</Label>
                    <input id="report-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} disabled={loading} className="h-8 w-full rounded-md border bg-background px-2 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="report-to" className="text-xs font-medium">{t("Sampai", "To")}</Label>
                    <input id="report-to" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} disabled={loading} className="h-8 w-full rounded-md border bg-background px-2 text-xs" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
          <LoadingButton type="button" onClick={handleSend} loading={loading} loadingText={t("Mengirim...", "Sending...")} disabled={!message.trim() || (attachReport && (!from || !to || from > to))} className="gap-2">
            <Send className="h-4 w-4" />
            {t("Kirim", "Send")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
