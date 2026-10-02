"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppTransition } from "@/lib/transition-provider";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { createEmptyInvoiceDraft } from "@/lib/actions/invoices";
import { toast } from "sonner";

export function DirectCreateInvoiceButton({
  clientId,
  className,
  variant = "default",
  size = "sm",
}: {
  clientId?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const { t } = useT();
  const router = useRouter();
  const { refresh } = useAppTransition();
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await createEmptyInvoiceDraft({ clientId });
      if (res && res.id) {
        router.push(`/app/invoices/${res.id}`);
        refresh();
      } else {
        toast.error(t("Gagal membuat invoice", "Failed to create invoice"));
        setLoading(false);
      }
    } catch (err: unknown) {
      toast.error((err as Error)?.message || t("Gagal membuat invoice", "Failed to create invoice"));
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleCreate}
      disabled={loading}
      className={className ?? "gap-1.5 font-semibold"}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
          <span>{t("Membuat...", "Creating...")}</span>
        </>
      ) : (
        <>
          <Plus className="h-4 w-4" />
          <span>{t("Invoice Baru", "New Invoice")}</span>
        </>
      )}
    </Button>
  );
}
