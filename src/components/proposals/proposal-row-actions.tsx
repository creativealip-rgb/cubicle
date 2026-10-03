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
import { deleteProposal } from "@/lib/actions/proposals";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";
import { SendProposalButton } from "./send-proposal-button";

export function ProposalRowActions({
  proposal,
  canWrite = true,
}: {
  proposal: {
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

  const isAccepted = proposal.status === "accepted";
  const publicHref = proposal.slug
    ? `/proposal/${proposal.slug}`
    : `/app/proposals/${proposal.id}/preview`;

  async function handleDelete() {
    try {
      await deleteProposal(proposal.id);
      toast.success(t("Proposal dihapus", "Proposal deleted"));
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
      <div className="flex items-center justify-end">
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
                <Link href={`/app/proposals/${proposal.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{isAccepted ? t("Detail Proposal", "Proposal Details") : t("Edit Dokumen", "Edit Document")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-1.5 rounded-lg">
                <a href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{t("Pratinjau Publik", "Public Preview")}</span>
                </a>
              </DropdownMenuItem>

              {!isAccepted && (
                <DropdownMenuItem
                  onSelect={() => setSendOpen(true)}
                  className="cursor-pointer text-xs font-medium py-1.5 rounded-lg text-primary focus:text-primary focus:bg-primary/10"
                >
                  <Send className="h-3.5 w-3.5 mr-2 text-primary" />
                  <span>
                    {proposal.status === "sent" || proposal.status === "viewed"
                      ? t("Kirim Ulang / Salin", "Resend / Copy Link")
                      : t("Kirim ke Klien", "Send to Client")}
                  </span>
                </DropdownMenuItem>
              )}

              {!isAccepted && (
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

      {/* Controlled Send Proposal Dialog */}
      <SendProposalButton
        proposalId={proposal.id}
        status={proposal.status}
        title={proposal.title}
        clientName={proposal.clientName ?? undefined}
        clientEmail={proposal.clientEmail ?? undefined}
        open={sendOpen}
        onOpenChange={setSendOpen}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("Hapus proposal?", "Delete proposal?")}
        description={t(
          `Apakah Anda yakin ingin menghapus "${proposal.title}"? Tindakan ini tidak dapat dibatalkan.`,
          `Are you sure you want to delete "${proposal.title}"? This action cannot be undone.`,
        )}
        confirmLabel={t("Hapus", "Delete")}
        cancelLabel={t("Batal", "Cancel")}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
