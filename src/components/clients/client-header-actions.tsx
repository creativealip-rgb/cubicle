"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveClient } from "@/lib/actions/clients";
import { useT } from "@/lib/i18n-client";

export function ClientHeaderActions({ clientId, editAction, deleteAction }: { clientId: string; editAction: ReactNode; deleteAction: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const open = (id: string) => window.setTimeout(() => document.getElementById(id)?.click(), 0);
  const archive = async () => {
    setArchiving(true);
    try { await archiveClient(clientId); router.refresh(); } finally { setArchiving(false); }
  };
  return <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={t("Aksi klien", "Client actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => open("client-edit")}><Pencil className="h-4 w-4" />{t("Ubah", "Edit")}</DropdownMenuItem>
        <DropdownMenuItem disabled={archiving} onSelect={archive}><Archive className="h-4 w-4" />{t("Arsipkan", "Archive")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => open("client-delete")}><Trash2 className="h-4 w-4" />{t("Hapus", "Delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div className="hidden" aria-hidden="true">{editAction}{deleteAction}</div>
  </div>;
}