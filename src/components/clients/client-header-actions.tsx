"use client";

import type { ReactNode } from "react";
import { Download, MoreHorizontal, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/lib/i18n-client";

export function ClientHeaderActions({ projectAction, invoiceAction, editAction, deleteAction, exportHref }: {
  projectAction?: ReactNode; invoiceAction?: ReactNode; editAction: ReactNode; deleteAction: ReactNode; exportHref: string;
}) {
  const { t } = useT();
  const open = (id: string) => window.setTimeout(() => document.getElementById(id)?.click(), 0);
  return <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button size="sm" className="gap-1.5"><Plus className="h-4 w-4" />{t("Buat", "Create")}</Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("Buat baru", "Create new")}</DropdownMenuLabel>
        {projectAction && <DropdownMenuItem onSelect={() => open("client-new-project")}><Plus className="h-4 w-4" />{t("Project Baru", "New Project")}</DropdownMenuItem>}
        {invoiceAction && <DropdownMenuItem onSelect={() => open("client-new-invoice")}><Receipt className="h-4 w-4" />{t("Invoice Baru", "New Invoice")}</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={t("Aksi klien", "Client actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem onSelect={() => open("client-edit")}><Pencil className="h-4 w-4" />{t("Ubah klien", "Edit client")}</DropdownMenuItem>
        <DropdownMenuItem asChild><a href={exportHref} download><Download className="h-4 w-4" />{t("Ekspor Excel", "Export Excel")}</a></DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => open("client-delete")}><Trash2 className="h-4 w-4" />{t("Hapus klien", "Delete client")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div className="hidden" aria-hidden="true">{projectAction}{invoiceAction}{editAction}{deleteAction}</div>
  </div>;
}
