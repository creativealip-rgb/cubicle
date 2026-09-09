"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ExpenseForm, type CategoryOption, type ProjectOption, type ClientOption } from "./expense-form";
import { useT } from "@/lib/i18n-client";

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
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label={t("Aksi pengeluaran", "Expense actions")}><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={() => setOpen(true)}><Pencil className="size-3.5" />{t("Edit", "Edit")}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex w-[calc(100%-1.5rem)] max-w-2xl max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0">
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
    </>
  );
}
