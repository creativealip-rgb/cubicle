"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { sendProposal } from "@/lib/actions/proposals";

export function SendProposalButton({
  proposalId,
  status,
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
  labelSend?: string;
  labelSending?: string;
  labelResend?: string;
  labelCopy?: string;
  labelCopied?: string;
  successMessage?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isSentLike = status === "sent" || status === "viewed";
  const sendText = isSentLike
    ? labelResend || "Kirim ulang"
    : labelSend || "Kirim";
  const sendingText = labelSending || "Mengirim...";

  async function handleSend() {
    setLoading(true);
    try {
      const result = await sendProposal(proposalId);
      const url = `${window.location.origin}/proposal/${result.token}`;
      setLink(url);
      toast.success(
        successMessage ||
          "Proposal siap dibagikan. Salin tautan ke klien.",
      );
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
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
          disabled={loading}
          className="h-7 px-2 text-xs"
        >
          <Send className="h-3.5 w-3.5 mr-1" />
          {loading ? sendingText : sendText}
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
        </div>
      ) : null}
      <Button
        variant={isSentLike ? "outline" : "default"}
        size="sm"
        onClick={handleSend}
        disabled={loading}
      >
        <Send className="h-3.5 w-3.5 mr-1" />
        {loading ? sendingText : sendText}
      </Button>
    </div>
  );
}
