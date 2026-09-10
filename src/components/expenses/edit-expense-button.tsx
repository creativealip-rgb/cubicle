"use client";

import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MoreHorizontal, Paperclip, Pencil, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpenseForm, type CategoryOption, type ProjectOption, type ClientOption } from "./expense-form";
import { useT } from "@/lib/i18n-client";
import { deleteExpense, getExpenseReceiptDownloadUrl } from "@/lib/actions/expenses";
import { useAppTransition } from "@/lib/transition-provider";
import { toast } from "sonner";

export interface EditableExpense {
  id: string;
  date: string;
  amount: string;
  currency: string;
  description: string;
  categoryId: string | null;
  projectId: string | null;
  clientId: string | null;
  vendor: string | null;
  taxIncluded: boolean;
  taxAmount: string | null;
  receiptUrl: string | null;
}

interface EditExpenseButtonProps {
  expense: EditableExpense;
  workspaceId: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
}

export function EditExpenseButton({
  expense,
  workspaceId,
  defaultCurrency,
  categories,
  projects,
  clients,
}: EditExpenseButtonProps) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function restoreTriggerFocus(event: Event) {
    event.preventDefault();
    triggerRef.current?.focus();
  }

  async function openReceipt() {
    setLoading(true);
    try {
      const url = await getExpenseReceiptDownloadUrl(expense.id);
      if (!url) return toast.error(t("Struk tidak ditemukan", "Receipt not found"));
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal buka struk", "Failed to open receipt"));
    } finally {
      setLoading(false);
    }
  }

  async function remove() {
    setLoading(true);
    try {
      await deleteExpense(expense.id);
      toast.success(t("Pengeluaran dihapus", "Expense deleted"));
      setConfirming(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal menghapus pengeluaran", "Failed to delete expense"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu><DropdownMenuTrigger asChild><Button ref={triggerRef} variant="ghost" size="icon" className="size-7" aria-label={t("Aksi pengeluaran", "Expense actions")}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setOpen(true)}><Pencil className="size-3.5" />{t("Edit", "Edit")}</DropdownMenuItem>{expense.receiptUrl ? <DropdownMenuItem onSelect={() => void openReceipt()} disabled={loading}><Paperclip className="size-3.5" />{t("Lihat struk", "View receipt")}</DropdownMenuItem> : null}<DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirming(true)}><Trash2 className="size-3.5" />{t("Hapus", "Delete")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onCloseAutoFocus={restoreTriggerFocus} className="flex w-[calc(100%-1.5rem)] max-w-2xl max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
            <DialogTitle>{t("Edit pengeluaran", "Edit expense")}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            workspaceId={workspaceId}
            defaultCurrency={defaultCurrency}
            categories={categories}
            projects={projects}
            clients={clients}
            mode="edit"
            initial={{
              id: expense.id,
              date: expense.date,
              amount: expense.amount,
              currency: expense.currency,
              description: expense.description,
              categoryId: expense.categoryId ?? "",
              projectId: expense.projectId ?? "",
              clientId: expense.clientId ?? "",
              vendor: expense.vendor ?? "",
              taxIncluded: expense.taxIncluded,
              taxAmount: expense.taxAmount ?? "",
              receiptUrl: expense.receiptUrl,
            }}
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent onCloseAutoFocus={restoreTriggerFocus} className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{t("Hapus pengeluaran?", "Delete expense?")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("Tindakan ini tidak dapat dibatalkan.", "This action cannot be undone.")}</p>
          <DialogFooter><Button variant="outline" onClick={() => setConfirming(false)} disabled={loading}>{t("Batal", "Cancel")}</Button><Button variant="destructive" onClick={remove} disabled={loading}>{loading ? <Loader2 className="size-4 animate-spin" /> : null}{t("Hapus", "Delete")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
