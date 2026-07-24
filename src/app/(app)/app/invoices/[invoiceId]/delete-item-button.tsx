"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteInvoiceItem } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function DeleteItemButton({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Hapus item invoice ini?")) return;
    setLoading(true);
    try {
      await deleteInvoiceItem(itemId);
      toast.success("Item dihapus");
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed");
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
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}
