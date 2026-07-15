"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Send, Copy, ExternalLink, Loader2, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { sendContract } from "@/lib/actions/contracts";

export function SendContractButton({
  contractId,
  status,
  compact = false,
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
  labelSend?: string;
  labelResend?: string;
  labelSending?: string;
  labelCopy?: string;
  labelCopied?: string;
  successMessage?: string;
}) {
  const router = useRouter();
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();

  const isSentLike = status === "sent" || status === "viewed";
  const sendText = isSentLike
    ? labelResend || "Kirim ulang"
    : labelSend || "Kirim untuk tanda tangan";
  const sendingText = labelSending || "Mengirim...";

  function handleSend() {
    startTransition(async () => {
      try {
        const { token } = await sendContract({ contractId });
        const url = `${window.location.origin}/contract/${token}`;
        setLink(url);
        toast.success(
          successMessage ||
            "Kontrak siap dibagikan. Salin tautan ke klien.",
        );
        router.refresh();
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

  if (compact) {
    return (
      <div className="flex items-center justify-end gap-1">
        {link ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyLink}
            className="h-7 px-2 text-xs"
            title={labelCopy || "Salin tautan"}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSend}
          disabled={pending}
          className="h-7 px-2 text-xs"
        >
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1" />
          )}
          {pending ? sendingText : sendText}
        </Button>
      </div>
    );
  }

  return (
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
        onClick={handleSend}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        ) : (
          <Send className="h-3.5 w-3.5 mr-1" />
        )}
        {pending ? sendingText : sendText}
      </Button>
    </div>
  );
}
