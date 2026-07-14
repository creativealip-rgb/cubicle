"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendInvoiceEmail } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function SendInvoiceButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoiceEmail(invoiceId);
      toast.success(t("Invoice terkirim ke email klien", "Invoice sent to client email"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengirim invoice", "Failed to send invoice"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" className="gap-2" onClick={handleSend} disabled={loading || disabled}>
      <Send className="h-4 w-4" />
      {loading ? t("Mengirim...", "Sending...") : t("Kirim Invoice", "Send invoice")}
    </Button>
  );
}
