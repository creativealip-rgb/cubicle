"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { archiveInvoice, unarchiveInvoice } from "@/lib/actions/invoices";
import { useT } from "@/lib/i18n-client";
import { MoreHorizontal, Edit, Archive, ArchiveRestore, ExternalLink, Loader2 } from "lucide-react";
import { buildInvoiceDetailUrl } from "@/lib/invoice-origin";

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
};

export function InvoiceRowActions({ invoiceId, invoiceNumber, status }: Props) {
  const { t } = useT();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isArchived = status === "archived";

  const handleArchive = (e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      try {
        if (isArchived) {
          await unarchiveInvoice(invoiceId, "draft");
          toast.success(t(`Invoice ${invoiceNumber} berhasil dipulihkan dari arsip`, `Invoice ${invoiceNumber} unarchived`));
        } else {
          await archiveInvoice(invoiceId);
          toast.success(t(`Invoice ${invoiceNumber} berhasil diarsipkan`, `Invoice ${invoiceNumber} archived`));
        }
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error)?.message || t("Gagal mengubah status arsip", "Failed to update archive status"));
      }
    });
  };

  return (
    <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={isPending}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4" />}
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg">
          <DropdownMenuItem asChild>
            <Link
              href={buildInvoiceDetailUrl(invoiceId, { type: "global" })}
              className="flex items-center gap-2 cursor-pointer text-xs font-medium"
            >
              <Edit className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("Edit / Buka Detail", "Edit / Open Details")}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link
              href={`/api/invoices/${invoiceId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 cursor-pointer text-xs font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{t("Unduh PDF", "Download PDF")}</span>
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={handleArchive}
            className="flex items-center gap-2 cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {isArchived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5 text-primary" />
                <span>{t("Pulihkan dari Arsip", "Unarchive Invoice")}</span>
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                <span>{t("Arsipkan Invoice", "Archive Invoice")}</span>
              </>
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
