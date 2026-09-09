"use client";

import { useState } from "react";
import { Archive, Ellipsis, Pencil, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { updateClientStatus } from "@/lib/actions/clients";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { ClientEditDialog } from "./client-edit-dialog";
import type { ClientListItem } from "./clients-list-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function ClientRowActions({ client }: { client: ClientListItem }) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const archived = client.status === "archived";
  const editTriggerId = `client-edit-${client.id}`;

  async function changeStatus() {
    setPending(true);
    try {
      await updateClientStatus(client.id, archived ? "active" : "archived");
      toast.success(archived ? t("Klien dipulihkan", "Client restored") : t("Klien diarsipkan", "Client archived"));
      setConfirmOpen(false);
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Gagal memperbarui klien", "Failed to update client"));
    } finally {
      setPending(false);
    }
  }

  return <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-7 rounded-md" aria-label={t("Aksi klien", "Client actions")}><Ellipsis className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-36">
        <DropdownMenuItem onSelect={() => window.setTimeout(() => document.getElementById(editTriggerId)?.click(), 0)}><Pencil className="size-3.5" />{t("Ubah", "Edit")}</DropdownMenuItem>
        <DropdownMenuItem className={archived ? "" : "text-amber-700 focus:text-amber-700"} onSelect={() => setConfirmOpen(true)}>
          {archived ? <RotateCcw className="size-3.5" /> : <Archive className="size-3.5" />}
          {archived ? t("Pulihkan", "Restore") : t("Arsipkan", "Archive")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <div className="hidden" aria-hidden="true"><ClientEditDialog defaultValues={{ id: client.id, clientNumber: client.clientNumber, name: client.name, companyName: client.companyName ?? undefined, email: client.email ?? undefined, phone: client.phone ?? undefined, website: client.website ?? undefined, address: client.address ?? undefined, internalNotes: client.internalNotes ?? undefined, tags: client.tags ?? [], portalEnabled: client.portalEnabled ?? false, portalSlug: client.portalSlug ?? undefined, portalSlugEnabled: client.portalSlugEnabled ?? false }} trigger={<button id={editTriggerId} type="button" />} /></div>
    <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{archived ? t("Pulihkan klien?", "Restore client?") : t("Arsipkan klien?", "Archive client?")}</DialogTitle>
          <DialogDescription>{archived ? t(`${client.name} akan kembali ke daftar klien aktif.`, `${client.name} will return to the active client list.`) : t(`${client.name} akan dipindahkan ke tab Arsip. Project, invoice, file, dan portal tidak dihapus.`, `${client.name} will move to Archived. Projects, invoices, files, and portal data will not be deleted.`)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={() => setConfirmOpen(false)}>{t("Batal", "Cancel")}</Button>
          <Button disabled={pending} onClick={() => void changeStatus()}>{pending ? t("Menyimpan...", "Saving...") : archived ? t("Pulihkan", "Restore") : t("Arsipkan", "Archive")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
