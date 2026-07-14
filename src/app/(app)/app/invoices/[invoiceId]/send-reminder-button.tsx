"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendInvoicePaymentReminder } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function SendReminderButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoicePaymentReminder(invoiceId);
      toast.success(t("Pengingat pembayaran terkirim", "Payment reminder sent"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengirim pengingat", "Failed to send reminder"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" variant="outline" className="gap-2" onClick={handleSend} disabled={loading || disabled}>
      <BellRing className="h-4 w-4" />
      {loading ? t("Mengirim...", "Sending...") : t("Ingatkan", "Remind")}
    </Button>
  );
}
