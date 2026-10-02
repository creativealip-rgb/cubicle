"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ellipsis,
  ExternalLink,
  Pencil,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";
import { deleteContract } from "@/lib/actions/contracts";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { SendContractButton } from "./send-contract-button";

export function ContractRowActions({
  contract,
  canWrite = true,
}: {
  contract: {
    id: string;
    title: string;
    status: string;
    slug?: string | null;
    clientName?: string | null;
    clientEmail?: string | null;
  };
  canWrite?: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);

  const isSigned = contract.status === "signed";
  const publicHref = contract.slug
    ? `/contract/${contract.slug}`
    : `/app/contracts/${contract.id}/preview`;

  async function handleDelete() {
    try {
      await deleteContract(contract.id);
      toast.success(t("Kontrak dihapus", "Contract deleted"));
      refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"),
      );
      throw err;
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1.5">
        {/* Primary Clean Action Button */}
        <Button
          asChild
          variant="outline"
          size="sm"
          className="h-7.5 px-3 text-xs font-semibold bg-background hover:bg-muted/60 border-border/80 text-foreground transition-all"
        >
          <Link href={`/app/contracts/${contract.id}/edit`}>
            {isSigned ? t("Lihat", "View") : t("Edit", "Edit")}
          </Link>
        </Button>

        {/* More Actions Dropdown Menu */}
        {canWrite && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7.5 w-7.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                aria-label={t("Menu aksi", "More actions")}
              >
                <Ellipsis className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-lg border border-border/80 p-1">
              <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-1.5 rounded-lg">
                <Link href={`/app/contracts/${contract.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{isSigned ? t("Detail Kontrak", "Contract Details") : t("Edit Dokumen", "Edit Document")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-1.5 rounded-lg">
                <a href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{t("Pratinjau Publik", "Public Preview")}</span>
                </a>
              </DropdownMenuItem>

              {!isSigned && (
                <DropdownMenuItem
                  onSelect={() => setSendOpen(true)}
                  className="cursor-pointer text-xs font-medium py-1.5 rounded-lg text-primary focus:text-primary focus:bg-primary/10"
                >
                  <Send className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>
                    {contract.status === "sent" || contract.status === "viewed"
                      ? t("Kirim Ulang / Salin", "Resend / Copy Link")
                      : t("Kirim ke Klien", "Send to Client")}
                  </span>
                </DropdownMenuItem>
              )}

              {!isSigned && (
                <>
                  <DropdownMenuSeparator className="my-1" />
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="cursor-pointer text-xs font-medium py-1.5 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
                    <span>{t("Hapus", "Delete")}</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Hidden Send Button Dialog Trigger */}
      <div className="hidden" aria-hidden="true">
        <SendContractButton
          contractId={contract.id}
          status={contract.status}
          title={contract.title}
          clientName={contract.clientName ?? undefined}
          clientEmail={contract.clientEmail ?? undefined}
        />
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("Hapus kontrak?", "Delete contract?")}
        description={t(
          `Apakah Anda yakin ingin menghapus "${contract.title}"? Tindakan ini tidak dapat dibatalkan.`,
          `Are you sure you want to delete "${contract.title}"? This action cannot be undone.`,
        )}
        confirmLabel={t("Hapus", "Delete")}
        cancelLabel={t("Batal", "Cancel")}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
