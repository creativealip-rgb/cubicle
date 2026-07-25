"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  ExpenseForm,
  type CategoryOption,
  type ProjectOption,
  type ClientOption,
} from "./expense-form";
import { useT } from "@/lib/i18n-client";

interface AddExpenseButtonProps {
  workspaceId: string;
  defaultCurrency: string;
  categories: CategoryOption[];
  projects: ProjectOption[];
  clients: ClientOption[];
  triggerLabel?: string;
  triggerClassName?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function AddExpenseButton({
  workspaceId,
  defaultCurrency,
  categories,
  projects,
  clients,
  triggerLabel,
  triggerClassName,
  variant = "default",
  size = "sm",
}: AddExpenseButtonProps) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const label = triggerLabel ?? t("Tambah Pengeluaran", "Add Expense");

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        {label}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex w-[calc(100%-1.5rem)] max-w-2xl max-h-[min(90dvh,720px)] flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b px-4 py-4 pr-12 sm:px-6">
            <DialogTitle>{t("Tambah pengeluaran", "Add expense")}</DialogTitle>
          </DialogHeader>
          <ExpenseForm
            workspaceId={workspaceId}
            defaultCurrency={defaultCurrency}
            categories={categories}
            projects={projects}
            clients={clients}
            mode="create"
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
