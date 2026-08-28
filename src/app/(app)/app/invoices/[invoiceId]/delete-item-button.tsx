"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAppTransition } from "@/lib/transition-provider";
import { deleteInvoiceItem } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t("Hapus item invoice ini?", "Delete this invoice item?"))) return;
    setLoading(true);
    try {
      await deleteInvoiceItem(itemId);
      toast.success(t("Item dihapus", "Item deleted"));
      refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("Gagal menghapus item", "Failed to delete item"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-red-600"
      onClick={handleDelete}
      disabled={loading}
      aria-label={t("Hapus item invoice", "Delete invoice item")}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
