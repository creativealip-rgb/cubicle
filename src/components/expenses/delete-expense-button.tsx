"use client";

import { useState } from "react";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { deleteExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";

import { useT } from "@/lib/i18n-client";

interface DeleteExpenseButtonProps {
  expenseId: string;
  description: string;
  mobile?: boolean;
}

export function DeleteExpenseButton({ expenseId, description: _description, mobile = false }: DeleteExpenseButtonProps) {
  const { refresh } = useAppTransition();
  const { t } = useT();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await deleteExpense(expenseId);
      toast.success(t("Pengeluaran dihapus", "Expense deleted"));
      setConfirming(false);
      refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("Terjadi kesalahan", "Something went wrong");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {!confirming && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 w-10 p-0 text-slate-400 hover:text-red-600"
        onClick={() => setConfirming(true)}
        title={t("Hapus", "Delete")}
        aria-label={mobile ? t("Hapus pengeluaran mobile", "Delete expense mobile") : t("Hapus pengeluaran", "Delete expense")}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      )}
      {confirming && (
        <>
          <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={loading}>{t("Batal", "Cancel")}</Button>
          <Button onClick={handleDelete} disabled={loading} size="sm" className="bg-red-600 hover:bg-red-700">
            {loading ? t("Menghapus...", "Deleting...") : t("Hapus", "Delete")}
          </Button>
        </>
      )}
    </span>
  );
}
