"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { revokeInvoiceShareToken } from "@/lib/actions/invoices";
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

  async function handleCopy() {
    if (token) {
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/invoice/${token}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link berbagi disalin");
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {!hasToken && !isExpired && (
        <p className="text-sm text-muted-foreground">
          Buat link berbagi untuk invoice ini. Siapa pun yang punya link bisa melihatnya.
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
            Link Berbagi (hanya tampil sekali)
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
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          asChild
        >
          <a href={`/api/invoices/share/generate?invoiceId=${invoiceId}`}>
            <RefreshCw className="h-3 w-3" />
            {loading ? "Membuat..." : "Buat Link Berbagi"}
          </a>
        </Button>
        {hasToken && !isExpired && (
          <form action="/api/invoices/share" method="post">
            <input type="hidden" name="invoiceId" value={invoiceId} />
            <input type="hidden" name="action" value="revoke" />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1 text-red-600 hover:text-red-700"
              onClick={handleCabut}
              disabled={loading}
            >
              <X className="h-3 w-3" />
              Cabut
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
