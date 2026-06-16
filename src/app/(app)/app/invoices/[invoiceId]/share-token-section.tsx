"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  generateInvoiceShareToken,
  revokeInvoiceShareToken,
} from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, X } from "lucide-react";

export function ShareTokenSection({
  invoiceId,
  hasToken,
  isExpired,
}: {
  invoiceId: string;
  hasToken: boolean;
  isExpired: boolean;
}) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      const result = await generateInvoiceShareToken(invoiceId);
      setToken(result.token);
      toast.success("Share link generated");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke() {
    setLoading(true);
    try {
      await revokeInvoiceShareToken(invoiceId);
      setToken(null);
      toast.success("Share link revoked");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (token) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/invoice/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Share link copied");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {!hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          Generate a shareable link for this invoice. Anyone with the link can
          view it.
        </p>
      )}

      {hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          This invoice has an active share link. Revoke it to disable access.
        </p>
      )}

      {isExpired && (
        <p className="text-sm text-amber-600">
          The share link has expired. Generate a new one.
        </p>
      )}

      {token && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Share Link (shown only once)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/invoice/${token}`
                : token}
            </code>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleGenerate}
          disabled={loading}
        >
          <RefreshCw className="h-3 w-3" />
          {loading ? "Generating..." : "Generate Share Link"}
        </Button>
        {hasToken && !isExpired && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-red-600 hover:text-red-700"
            onClick={handleRevoke}
            disabled={loading}
          >
            <X className="h-3 w-3" />
            Revoke
          </Button>
        )}
      </div>
    </div>
  );
}
