"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal, Pencil, Trash2, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveClient, revokePortalToken } from "@/lib/actions/clients";
import { useT } from "@/lib/i18n-client";
import { toast } from "sonner";

export function ClientHeaderActions({ clientId, portalEnabled, editAction, deleteAction }: { clientId: string; portalEnabled?: boolean; editAction: ReactNode; deleteAction: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const open = (id: string) => window.setTimeout(() => document.getElementById(id)?.click(), 0);
  const archive = async () => {
    setArchiving(true);
    try { await archiveClient(clientId); router.refresh(); } finally { setArchiving(false); }
  };
  const handleRevokePortal = async () => {
    if (!window.confirm(t("Cabut akses Client Portal untuk klien ini? Klien tidak akan bisa membuka link portal lagi.", "Revoke Client Portal access for this client? The client will no longer be able to access the portal."))) {
      return;
    }
    setRevoking(true);
    try {
      await revokePortalToken(clientId);
      toast.success(t("Akses Client Portal berhasil dicabut", "Client Portal access revoked successfully"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mencabut akses portal", "Failed to revoke portal access"));
    } finally {
      setRevoking(false);
    }
  };
  return <div className="flex items-center gap-2">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={t("Aksi klien", "Client actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onSelect={() => open("client-edit")}><Pencil className="h-4 w-4" />{t("Ubah", "Edit")}</DropdownMenuItem>
        {portalEnabled && (
          <DropdownMenuItem disabled={revoking} onSelect={handleRevokePortal} className="text-amber-600 dark:text-amber-400">
            <ShieldBan className="h-4 w-4" />
            {t("Cabut Akses Portal", "Revoke Portal Access")}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem disabled={archiving} onSelect={archive}><Archive className="h-4 w-4" />{t("Arsipkan", "Archive")}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => open("client-delete")}><Trash2 className="h-4 w-4" />{t("Hapus", "Delete")}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div className="hidden" aria-hidden="true">{editAction}{deleteAction}</div>
  </div>;
}