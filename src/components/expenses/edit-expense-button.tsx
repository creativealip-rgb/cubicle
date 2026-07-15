"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
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
      <Button
        variant="ghost"
        size="sm"
        className="h-7 w-7 p-0 text-slate-400 hover:text-slate-800"
        onClick={() => setOpen(true)}
        title={t("Edit", "Edit")}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
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
