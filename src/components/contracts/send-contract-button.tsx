"use client";

import { useState, useTransition } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Copy, ExternalLink, Loader2, Check, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { sendContract } from "@/lib/actions/contracts";
import { useT } from "@/lib/i18n-client";

export function SendContractButton({
  contractId,
  status,
  compact = false,
  title,
  clientName,
  clientEmail,
  labelSend,
  labelResend,
  labelSending,
  labelCopy,
  labelCopied,
  successMessage,
}: {
  contractId: string;
  status?: string;
  compact?: boolean;
  /** Document title — used to build the email subject shown in the confirm dialog. */
  title?: string;
  /** Recipient shown in the confirm dialog. */
  clientName?: string;
  clientEmail?: string | null;
  labelSend?: string;
  labelResend?: string;
  labelSending?: string;
  labelCopy?: string;
  labelCopied?: string;
  successMessage?: string;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const isSentLike = status === "sent" || status === "viewed";
  const sendText = isSentLike
    ? labelResend || "Kirim ulang"
    : labelSend || "Kirim untuk tanda tangan";
  const sendingText = labelSending || "Mengirim...";
  const subject = title
    ? `Contract for signature: ${title}`
    : t("Kontrak untuk ditandatangani", "Contract for signature");
  const defaultMessage = `Halo ${clientName || ""},\n\nKontrak "${title || "ini"}" sudah siap untuk ditinjau dan ditandatangani.\n\nSilakan buka tautan kontrak berikut:\n{{contract_link}}\n\nTerima kasih.`;
  const [message, setMessage] = useState(defaultMessage);

  function handleSend() {
    startTransition(async () => {
      try {
        const { token } = await sendContract({ contractId, customMessage: message.trim() || undefined });
        const url = `${window.location.origin}/contract/${token}`;
        setLink(url);
        setOpen(false);
        toast.success(
          successMessage ||
            "Kontrak siap dibagikan. Salin tautan ke klien.",
        );
        refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Gagal mengirim";
        toast.error(msg);
      }
    });
  }

  async function copyLink() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success(labelCopied || "Tautan disalin");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {link ? (
          <div className="flex min-w-0 max-w-full items-center gap-1 rounded-md border bg-muted/40 px-2 py-1">
            <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="max-w-[220px] truncate text-xs text-muted-foreground sm:max-w-[320px]">
              {link}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyLink}
              className="h-7 px-2 text-xs"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  {labelCopied || "Disalin"}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  {labelCopy || "Salin"}
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" asChild className="h-7 px-2">
              <a href={link} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        ) : null}
        <Button
          variant={isSentLike ? "outline" : "default"}
          size="sm"
          onClick={() => setOpen(true)}
          disabled={pending}
          className={compact ? "h-7 px-2 text-xs" : undefined}
          aria-label={pending ? sendingText : sendText}
          title={pending ? sendingText : sendText}
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          {pending ? sendingText : sendText}
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) {
            if (next) setMessage(defaultMessage);
            setOpen(next);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {isSentLike
                ? t("Kirim ulang kontrak", "Resend contract")
                : labelSend || t("Kirim kontrak", "Send contract")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Periksa penerima dan subjek sebelum mengirim.",
                "Review the recipient and subject before sending.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <label className="block space-y-2">
              <span className="block text-sm font-medium text-foreground">{t("Pesan", "Message")}</span>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                disabled={pending}
                className="min-h-40 resize-y leading-relaxed"
                placeholder={t("Pesan tambahan untuk client (opsional)", "Optional message to client")}
              />
            </label>
            <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
              <div className="space-y-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Penerima", "Recipient")}
                </span>
                <span className="block min-w-0 break-words font-medium">
                  {clientName || clientEmail
                    ? [clientName, clientEmail].filter(Boolean).join(" · ")
                    : t("Belum ada penerima", "No recipient set")}
                </span>
              </div>
              <div className="space-y-1">
                <span className="block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("Subjek", "Subject")}
                </span>
                <span className="block min-w-0 break-words font-medium">{subject}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleSend} disabled={pending}>
              {pending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              {pending ? sendingText : sendText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
