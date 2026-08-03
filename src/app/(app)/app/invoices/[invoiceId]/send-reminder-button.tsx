"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
    <LoadingButton size="sm" variant="outline" className="gap-2" onClick={handleSend} loading={loading} disabled={disabled}>
      <Mail className="h-3.5 w-3.5" />
      {t("Ingatkan", "Remind")}
    </LoadingButton>
  );
}
