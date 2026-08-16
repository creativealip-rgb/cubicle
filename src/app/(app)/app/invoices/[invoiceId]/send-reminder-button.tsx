"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { sendInvoicePaymentReminder } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function SendReminderButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoicePaymentReminder(invoiceId);
      toast.success(t("Pengingat pembayaran terkirim", "Payment reminder sent"));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengirim pengingat", "Failed to send reminder"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <LoadingButton size="sm" variant="outline" className="gap-2" onClick={handleSend} loading={loading} disabled={disabled}>
      <BellRing className="h-4 w-4" />
      {t("Ingatkan", "Remind")}
    </LoadingButton>
  );
}
