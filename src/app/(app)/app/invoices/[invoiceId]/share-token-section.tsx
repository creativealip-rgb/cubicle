"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { generateInvoiceShareToken, revokeInvoiceShareToken } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw, X } from "lucide-react";

function sharePdfUrl(token: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/api/invoices/share/${token}/pdf`;
}

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

  async function handleCabut() {
    setLoading(true);
    try {
      await revokeInvoiceShareToken(invoiceId);
      setToken(null);
      toast.success("Link berbagi dicabut");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const generated = await generateInvoiceShareToken(invoiceId);
      setToken(generated.token);
      toast.success("Link PDF dibuat");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal buat link");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!token) return;
    const url = sharePdfUrl(token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link PDF disalin");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {!hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          Buat link berbagi PDF invoice. Siapa pun yang punya link bisa buka file PDF yang sama
          seperti tombol Unduh PDF.
        </p>
      )}

      {hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          Invoice ini punya link berbagi aktif. Cabut untuk menonaktifkan akses.
        </p>
      )}

      {isExpired && (
        <p className="text-sm text-amber-600">
          Link berbagi sudah kedaluwarsa. Buat link baru.
        </p>
      )}

      {token && (
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Link PDF (hanya tampil sekali)
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-background rounded px-2 py-1 break-all">
              {sharePdfUrl(token)}
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
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={handleGenerate}
          disabled={loading}
        >
          <RefreshCw className="h-3 w-3" />
          {loading ? "Membuat..." : "Buat Link PDF"}
        </Button>
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
            Cabut
          </Button>
        )}
      </div>
    </div>
  );
}
