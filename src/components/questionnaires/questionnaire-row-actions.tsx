"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Ellipsis,
  ExternalLink,
  Eye,
  Pencil,
  Share2,
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
import { deleteQuestionnaire } from "@/lib/actions/questionnaires";
import { useAppTransition } from "@/lib/transition-provider";
import { useT } from "@/lib/i18n-client";

export function QuestionnaireRowActions({
  questionnaire,
  canWrite = true,
}: {
  questionnaire: {
    id: string;
    name: string;
    slug?: string | null;
  };
  canWrite?: boolean;
}) {
  const { t } = useT();
  const { refresh } = useAppTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const publicHref = questionnaire.slug
    ? `/intake/${questionnaire.slug}`
    : `/intake/${questionnaire.id}`;

  async function handleDelete() {
    try {
      await deleteQuestionnaire(questionnaire.id);
      toast.success(t("Formulir dihapus", "Questionnaire deleted"));
      refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : t("Gagal menghapus", "Failed to delete"),
      );
      throw err;
    }
  }

  async function copyPublicLink() {
    const url = `${window.location.origin}${publicHref}`;
    await navigator.clipboard.writeText(url);
    toast.success(t("Link publik formulir disalin!", "Public form link copied!"));
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
                <Link href={`/app/questionnaires/${questionnaire.id}`}>
                  <Eye className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{t("Buka Tanggapan", "View Responses")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-1.5 rounded-lg">
                <Link href={`/app/questionnaires/${questionnaire.id}/edit`}>
                  <Pencil className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{t("Edit Formulir", "Edit Form")}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="cursor-pointer text-xs font-medium py-1.5 rounded-lg">
                <a href={publicHref} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  <span>{t("Pratinjau Publik", "Public Preview")}</span>
                </a>
              </DropdownMenuItem>

              <DropdownMenuItem
                onSelect={() => void copyPublicLink()}
                className="cursor-pointer text-xs font-medium py-1.5 rounded-lg text-primary focus:text-primary focus:bg-primary/10"
              >
                <Share2 className="h-3.5 w-3.5 mr-2 text-primary" />
                <span>{t("Salin Link Publik", "Copy Share Link")}</span>
              </DropdownMenuItem>

              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onSelect={() => setDeleteOpen(true)}
                className="cursor-pointer text-xs font-medium py-1.5 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5 mr-2 text-destructive" />
                <span>{t("Hapus", "Delete")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={t("Hapus formulir?", "Delete form?")}
        description={t(
          `Apakah Anda yakin ingin menghapus "${questionnaire.name}"? Tanggapan yang terkait akan tetap tersimpan.`,
          `Are you sure you want to delete "${questionnaire.name}"? Associated responses will remain archived.`,
        )}
        confirmLabel={t("Hapus", "Delete")}
        cancelLabel={t("Batal", "Cancel")}
        onConfirm={handleDelete}
        destructive
      />
    </>
  );
}
