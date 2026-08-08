"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteInvoice } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";

export function DeleteInvoiceButton({ invoiceId, disabled, backUrl = "/app/invoices" }: { invoiceId: string; disabled?: boolean; backUrl?: string }) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteInvoice(invoiceId);
      toast.success(t("Invoice dihapus", "Invoice deleted"));
      setOpen(false);
      router.push(backUrl);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("Gagal menghapus invoice", "Failed to delete invoice");
      toast.error(msg);
      setLoading(false);
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled} className="gap-1 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          {t("Hapus", "Delete")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Hapus invoice ini?", "Delete this invoice?")}</DialogTitle>
          <DialogDescription>
            {t("Invoice akan dihapus permanen bersama semua item dan pembayaran terkait. Aksi ini tidak bisa dibatalkan.", "Invoice will be permanently deleted along with all related items and payments. This action cannot be undone.")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
          <LoadingButton variant="destructive" onClick={handleDelete} loading={loading} loadingText={t("Menghapus…", "Deleting…")}>
            {t("Hapus Permanen", "Delete Permanently")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
