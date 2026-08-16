"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/lib/i18n-client";

interface DeleteExpenseButtonProps {
  expenseId: string;
  description: string;
}

export function DeleteExpenseButton({ expenseId, description }: DeleteExpenseButtonProps) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteExpense(expenseId);
      toast.success(t("Pengeluaran dihapus", "Expense deleted"));
      setOpen(false);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Terjadi kesalahan", "Something went wrong");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 text-slate-400 hover:text-red-600"
        onClick={() => setOpen(true)}
        title={t("Hapus", "Delete")}
        aria-label={t("Hapus pengeluaran", "Delete expense")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Hapus pengeluaran ini?", "Delete this expense?")}</DialogTitle>
          <DialogDescription>
            {t(
              `"${description}" akan dihapus permanen. Tidak bisa dibatalkan.`,
              `"${description}" will be permanently removed. This can't be undone.`,
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading}>
            {t("Batal", "Cancel")}
          </Button>
          <LoadingButton
            onClick={handleDelete}
            loading={loading}
            loadingText={t("Menghapus...", "Deleting...")}
            size="sm"
            className="bg-red-600 hover:bg-red-700"
          >
            {t("Hapus", "Delete")}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
