"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const router = useRouter();
  const { t } = useT();
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
      router.refresh();
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
        <Button size="sm" className="gap-2" disabled={disabled}>
          <Send className="h-4 w-4" />
          {t("Kirim Invoice", "Send invoice")}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("Kirim Invoice", "Send invoice")}</DialogTitle>
          <DialogDescription>
            {t(
              `Pesan dikirim ke ${clientEmail || "email klien"}. Link PDF invoice ditambahkan otomatis melalui {{invoice_link}}.`,
              `Message will be sent to ${clientEmail || "client email"}. The PDF link is inserted through {{invoice_link}}.`,
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invoice-message">{t("Body pesan", "Message body")}</Label>
          <Textarea
            id="invoice-message"
            rows={9}
            maxLength={10000}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={loading}
            className="max-h-[42dvh] resize-y"
          />
          <p className="text-right text-xs text-muted-foreground">{message.length.toLocaleString()}/10.000</p>
        </div>

        <div className="space-y-3 rounded-md border p-3">
          <div className="flex items-start gap-2">
            <input
              id="attach-detail-report"
              type="checkbox"
              checked={attachReport}
              onChange={(event) => setAttachReport(event.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border"
            />
            <Label htmlFor="attach-detail-report" className="cursor-pointer leading-5">
              {t("Lampirkan link detail report", "Attach detail report link")}
            </Label>
          </div>
          {attachReport ? (
            <div className="grid grid-cols-2 gap-3 pl-6">
              <div className="space-y-1">
                <Label htmlFor="report-from">{t("Dari", "From")}</Label>
                <input id="report-from" type="date" value={from} max={to} onChange={(event) => setFrom(event.target.value)} disabled={loading} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="report-to">{t("Sampai", "To")}</Label>
                <input id="report-to" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} disabled={loading} className="h-9 w-full rounded-md border bg-background px-3 text-sm" />
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
          <Button type="button" onClick={handleSend} disabled={loading || !message.trim() || (attachReport && (!from || !to || from > to))} className="gap-2">
            <Send className="h-4 w-4" />
            {loading ? t("Mengirim...", "Sending...") : t("Kirim", "Send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
