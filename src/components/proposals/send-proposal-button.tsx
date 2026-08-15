"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Copy, Check, Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { sendProposal } from "@/lib/actions/proposals";
import { useT } from "@/lib/i18n-client";

export function SendProposalButton({
  proposalId,
  status,
  title,
  clientName,
  clientEmail,
  labelSend,
  labelSending,
  labelResend,
  labelCopy,
  labelCopied,
  successMessage,
  compact = false,
}: {
  proposalId: string;
  status?: string;
  /** Document title — used to build the email subject shown in the confirm dialog. */
  title?: string;
  /** Recipient shown in the confirm dialog. */
  clientName?: string;
  clientEmail?: string | null;
  labelSend?: string;
  labelSending?: string;
  labelResend?: string;
  labelCopy?: string;
  labelCopied?: string;
  successMessage?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  const isSentLike = status === "sent" || status === "viewed";
  const sendText = isSentLike
    ? labelResend || "Kirim ulang"
    : labelSend || "Kirim";
  const sendingText = labelSending || "Mengirim...";
  const subject = title ? `Proposal: ${title}` : t("Proposal", "Proposal");

  function handleSend() {
    startTransition(async () => {
      try {
        const result = await sendProposal(proposalId, message.trim() || undefined);
        const url = `${window.location.origin}/proposal/${result.token}`;
        setLink(url);
        setOpen(false);
        toast.success(
          successMessage ||
            "Proposal siap dibagikan. Salin tautan ke klien.",
        );
        router.refresh();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
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
                  <Check className="h-3.5 w-3.5 text-emerald-600 mr-1" />
                  {labelCopied || "Disalin"}
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  {labelCopy || "Salin"}
                </>
              )}
            </Button>
          </div>
        ) : null}
        <Button
          variant={isSentLike ? "outline" : "default"}
          size={compact ? "sm" : "sm"}
          onClick={() => setOpen(true)}
          disabled={pending}
          className={compact ? "h-7 px-2 text-xs" : undefined}
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          {pending ? sendingText : sendText}
        </Button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!pending) setOpen(next);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isSentLike
                ? t("Kirim ulang proposal", "Resend proposal")
                : labelSend || t("Kirim proposal", "Send proposal")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "Periksa penerima dan subjek sebelum mengirim.",
                "Review the recipient and subject before sending.",
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <label className="block"><span className="mb-1 block text-muted-foreground">{t("Pesan", "Message")}</span><textarea className="min-h-24 w-full rounded-md border p-2" value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t("Pesan tambahan untuk client (opsional)", "Optional message to client")} /></label>
            <div className="flex gap-2">
              <span className="w-20 shrink-0 text-muted-foreground">
                {t("Penerima", "Recipient")}
              </span>
              <span className="min-w-0 break-words font-medium">
                {clientName || clientEmail
                  ? [clientName, clientEmail].filter(Boolean).join(" · ")
                  : t("Belum ada penerima", "No recipient set")}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="w-20 shrink-0 text-muted-foreground">
                {t("Subjek", "Subject")}
              </span>
              <span className="min-w-0 break-words font-medium">{subject}</span>
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
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5 mr-1" />
              )}
              {pending ? sendingText : sendText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
