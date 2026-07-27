"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Paperclip, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExpenseReceiptDownloadUrl } from "@/lib/actions/expenses";
import { useT } from "@/lib/i18n-client";

export function ReceiptLinkButton({ expenseId }: { expenseId: string }) {
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const url = await getExpenseReceiptDownloadUrl(expenseId);
      if (!url) {
        toast.error(t("Struk tidak ditemukan", "Receipt not found"));
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal buka struk", "Failed to open receipt"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-10 w-10 p-0 text-slate-400 hover:text-blue-600"
      onClick={open}
      title={t("Lihat struk", "View receipt")}
      aria-label={t("Lihat struk", "View receipt")}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
    </Button>
  );
}

export function ReceiptExternalHint() {
  return <ExternalLink className="h-3 w-3" />;
}
