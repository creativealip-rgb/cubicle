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
import { Loader2, MoreHorizontal, Paperclip, Pencil, Repeat, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpenseForm, type CategoryOption, type ProjectOption, type ClientOption } from "./expense-form";
import { useT } from "@/lib/i18n-client";
import { deleteExpense, getExpenseReceiptDownloadUrl } from "@/lib/actions/expenses";
import { createRecurring } from "@/lib/actions/recurring";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [recurringModal, setRecurringModal] = useState(false);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [recurringEndDate, setRecurringEndDate] = useState("");
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

  async function handleConvertToRecurring() {
    setLoading(true);
    try {
      await createRecurring({
        workspaceId,
        name: expense.description,
        amount: parseFloat(expense.amount) || 0,
        currency: expense.currency || defaultCurrency,
        categoryId: expense.categoryId || null,
        projectId: expense.projectId || null,
        frequency,
        startDate: expense.date || new Date().toISOString().split("T")[0],
        endDate: recurringEndDate || null,
        notes: expense.vendor ? `Vendor: ${expense.vendor}` : null,
      });
      toast.success(t("Jadwal pengeluaran rutin berhasil dibuat", "Recurring expense schedule created"));
      setRecurringModal(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal membuat jadwal rutin", "Failed to create recurring schedule"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="ghost" size="icon" className="size-7" aria-label={t("Aksi pengeluaran", "Expense actions")}>
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <Pencil className="size-3.5" />
            {t("Edit", "Edit")}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setRecurringModal(true)}>
            <Repeat className="size-3.5 text-primary" />
            {t("Ubah jadi rutin", "Make recurring")}
          </DropdownMenuItem>
          {expense.receiptUrl ? (
            <DropdownMenuItem onSelect={() => void openReceipt()} disabled={loading}>
              <Paperclip className="size-3.5" />
              {t("Lihat struk", "View receipt")}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirming(true)}>
            <Trash2 className="size-3.5" />
            {t("Hapus", "Delete")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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

      <Dialog open={recurringModal} onOpenChange={setRecurringModal}>
        <DialogContent onCloseAutoFocus={restoreTriggerFocus} className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              {t("Jadikan Pengeluaran Rutin", "Make Recurring Expense")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Deskripsi", "Description")}:</span>
                <span className="font-semibold text-foreground">{expense.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("Jumlah", "Amount")}:</span>
                <span className="font-semibold text-foreground">{expense.currency} {expense.amount}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recFreq" className="text-xs">{t("Frekuensi Rutin", "Recurring Frequency")}</Label>
              <Select
                value={frequency}
                onValueChange={(v: "monthly" | "quarterly" | "yearly") => setFrequency(v)}
              >
                <SelectTrigger id="recFreq" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">{t("Harian", "Daily")}</SelectItem>
                  <SelectItem value="weekly">{t("Mingguan", "Weekly")}</SelectItem>
                  <SelectItem value="monthly">{t("Bulanan", "Monthly")}</SelectItem>
                  <SelectItem value="quarterly">{t("Triwulanan (3 Bulan)", "Quarterly (3 Months)")}</SelectItem>
                  <SelectItem value="yearly">{t("Tahunan", "Yearly")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="recEnd" className="text-xs">{t("Tanggal Berakhir (opsional)", "End Date (optional)")}</Label>
              <Input
                id="recEnd"
                type="date"
                value={recurringEndDate}
                onChange={(e) => setRecurringEndDate(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRecurringModal(false)} disabled={loading}>
              {t("Batal", "Cancel")}
            </Button>
            <Button onClick={handleConvertToRecurring} disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin mr-1" /> : <Repeat className="size-3.5 mr-1" />}
              {t("Buat Jadwal Rutin", "Create Schedule")}
            </Button>
          </DialogFooter>
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
