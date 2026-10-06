"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, MoreHorizontal, Pencil, Trash2, ShieldBan } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { archiveClient, revokePortalToken, restorePortalAccess } from "@/lib/actions/clients";
import { useT } from "@/lib/i18n-client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

export function ClientHeaderActions({ clientId, portalEnabled, editAction, deleteAction }: { clientId: string; portalEnabled?: boolean; editAction: ReactNode; deleteAction: ReactNode }) {
  const { t } = useT();
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const open = (id: string) => window.setTimeout(() => document.getElementById(id)?.click(), 0);
  const archive = async () => {
    setArchiving(true);
    try { await archiveClient(clientId); router.refresh(); } finally { setArchiving(false); }
  };
  const handleRevokePortal = async () => {
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
  const handleRestorePortal = async () => {
    setRestoring(true);
    try {
      await restorePortalAccess(clientId);
      toast.success(t("Akses Client Portal berhasil diaktifkan kembali", "Client Portal access restored successfully"));
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("Gagal mengaktifkan akses portal", "Failed to restore portal access"));
    } finally {
      setRestoring(false);
    }
  };
  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-9 w-9" aria-label={t("Aksi klien", "Client actions")}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onSelect={() => open("client-edit")}><Pencil className="h-4 w-4" />{t("Ubah", "Edit")}</DropdownMenuItem>
            {portalEnabled ? (
              <DropdownMenuItem disabled={revoking} onSelect={() => setShowRevokeConfirm(true)} className="text-amber-600 dark:text-amber-400">
                <ShieldBan className="h-4 w-4" />
                {t("Cabut Akses Portal", "Revoke Portal Access")}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem disabled={restoring} onSelect={handleRestorePortal} className="text-emerald-600 dark:text-emerald-400">
                <ShieldBan className="h-4 w-4" />
                {t("Aktifkan Portal", "Enable Portal")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem disabled={archiving} onSelect={archive}><Archive className="h-4 w-4" />{t("Arsipkan", "Archive")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => open("client-delete")}><Trash2 className="h-4 w-4" />{t("Hapus", "Delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="hidden" aria-hidden="true">{editAction}{deleteAction}</div>
      </div>

      <ConfirmDialog
        open={showRevokeConfirm}
        onOpenChange={setShowRevokeConfirm}
        title={t("Cabut Akses Portal Klien?", "Revoke Client Portal Access?")}
        description={t(
          "Klien tidak akan bisa membuka link portal dan melihat invoice/proyek lagi sampai diaktifkan kembali.",
          "The client will no longer be able to open the portal link or view invoices/projects until access is restored."
        )}
        confirmLabel={t("Cabut Akses", "Revoke Access")}
        cancelLabel={t("Batal", "Cancel")}
        destructive
        onConfirm={handleRevokePortal}
      />
    </>
  );
}