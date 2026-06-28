"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendInvoiceEmail } from "@/lib/actions/invoices";

export function SendInvoiceButton({ invoiceId, disabled }: { invoiceId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    setLoading(true);
    try {
      await sendInvoiceEmail(invoiceId);
      toast.success("Invoice sent to client email");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button size="sm" className="gap-2" onClick={handleSend} disabled={loading || disabled}>
      <Send className="h-4 w-4" />
      {loading ? "Sending..." : "Send invoice"}
    </Button>
  );
}
