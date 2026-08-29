"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";
import { generateInvoiceShareToken, revokeInvoiceShareToken } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Copy, Check, ExternalLink, RefreshCw, X } from "lucide-react";
import { useT } from "@/lib/i18n-client";

function shareInvoiceUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/invoice/${token}`;
}

export function ShareTokenSection({
  invoiceId,
  hasToken,
  isExpired,
  initialToken,
}: {
  invoiceId: string;
  hasToken: boolean;
  isExpired: boolean;
  initialToken: string | null;
}) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [token, setToken] = useState<string | null>(initialToken);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleCabut() {
    setLoading(true);
    try {
      await revokeInvoiceShareToken(invoiceId);
      setToken(null);
      toast.success(t("Link berbagi dicabut", "Share link revoked"));
      refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const generated = await generateInvoiceShareToken(invoiceId);
      setToken(generated.token);
      toast.success(t("Link invoice dibuat", "Invoice link created"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal buat link", "Failed to create link"));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!token) return;
    const url = shareInvoiceUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(t("Link invoice disalin", "Invoice link copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {!hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          {t("Buat link berbagi invoice. Siapa pun yang punya link bisa melihat invoice tanpa login.", "Create a share link. Anyone with the link can view the invoice without signing in.")}
        </p>
      )}

      {hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          {t("Invoice ini punya link berbagi aktif. Cabut untuk menonaktifkan akses.", "This invoice has an active share link. Revoke it to disable access.")}
        </p>
      )}

      {isExpired && (
        <p className="text-sm text-amber-600">
          {t("Link berbagi sudah kedaluwarsa. Buat link baru.", "The share link has expired. Create a new link.")}
        </p>
      )}

      {token && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {t("Link invoice (hanya tampil sekali)", "Invoice link (shown once)")}
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
              {shareInvoiceUrl(token)}
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

      <div className="flex flex-wrap gap-2">
        {token && (
          <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
            <a href={shareInvoiceUrl(token)} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3 w-3" />
              {t("Lihat Invoice", "View Invoice")}
            </a>
          </Button>
        )}
        <LoadingButton
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleGenerate}
          loading={loading}
        >
          <RefreshCw className="h-3 w-3" />
          {t("Buat Link Invoice", "Create Invoice Link")}
        </LoadingButton>
        {hasToken && !isExpired && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1 text-red-600 hover:text-red-700"
            onClick={handleCabut}
            disabled={loading}
          >
            <X className="h-3 w-3" />
            {t("Cabut", "Revoke")}
          </Button>
        )}
      </div>
    </div>
  );
}
