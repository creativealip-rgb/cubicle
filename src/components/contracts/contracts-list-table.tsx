"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { projectStatusVariant } from "@/lib/status-badge";
import { SendContractButton } from "@/components/contracts/send-contract-button";

export type ContractListItem = {
  id: string;
  title: string;
  status: string;
  sentAt: Date | string | null;
  viewedAt: Date | string | null;
  signedAt: Date | string | null;
  declinedAt: Date | string | null;
  validUntil: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string | null;
  clientId: string;
  clientName: string;
};

const STATUS_ORDER = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "revoked",
] as const;

type SortKey = "title" | "client" | "status" | "activity";

function activityTs(c: ContractListItem): number {
  const pick =
    c.status === "signed"
      ? c.signedAt || c.updatedAt || c.createdAt
      : c.status === "declined"
        ? c.declinedAt || c.updatedAt || c.createdAt
        : c.status === "viewed"
          ? c.viewedAt || c.sentAt || c.updatedAt || c.createdAt
          : c.status === "sent"
            ? c.sentAt || c.updatedAt || c.createdAt
            : c.status === "revoked"
              ? c.updatedAt || c.createdAt
              : c.status === "expired"
                ? c.validUntil || c.updatedAt || c.createdAt
                : c.createdAt;
  const t = new Date(pick as string | Date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function activityLabel(
  c: ContractListItem,
  t: (id: string, en: string) => string,
  lang: string,
) {
  const locale = lang === "en" ? "en-US" : "id-ID";
  const fmt = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(locale) : "";

  if (c.status === "signed") {
    return `${t("Ditandatangani", "Signed")} ${fmt(c.signedAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "declined") {
    return `${t("Ditolak", "Declined")} ${fmt(c.declinedAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "viewed") {
    return `${t("Dilihat", "Viewed")} ${fmt(c.viewedAt || c.sentAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "sent") {
    return `${t("Terkirim", "Sent")} ${fmt(c.sentAt || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "revoked") {
    return `${t("Dicabut", "Revoked")} ${fmt(c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "expired") {
    return `${t("Kedaluwarsa", "Expired")} ${fmt(c.validUntil || c.updatedAt || c.createdAt)}`;
  }
  if (c.status === "draft") {
    return `${t("Draf", "Draft")} ${fmt(c.createdAt)}`;
  }
  return fmt(c.updatedAt || c.createdAt);
}

export function ContractsListTable({
  rows,
  canWrite,
}: {
  rows: ContractListItem[];
  canWrite: boolean;
}) {
  const { t, lang } = useT();

  const getters = useMemo(
    () => ({
      title: (r: ContractListItem) => r.title,
      client: (r: ContractListItem) => r.clientName,
      status: (r: ContractListItem) => r.status,
      activity: (r: ContractListItem) => activityTs(r),
    }),
    [],
  );

  const orders = useMemo(() => ({ status: STATUS_ORDER }), []);
  const { sorted, toggle, dirFor } = useTableSort<ContractListItem, SortKey>(
    rows,
    getters,
    orders,
  );

  return (
    <div className="bg-white rounded-2xl border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader
                label={t("Judul", "Title")}
                dir={dirFor("title")}
                onClick={() => toggle("title")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Klien", "Client")}
                dir={dirFor("client")}
                onClick={() => toggle("client")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Status", "Status")}
                dir={dirFor("status")}
                onClick={() => toggle("status")}
              />
            </TableHead>
            <TableHead>
              <SortableHeader
                label={t("Aktivitas", "Activity")}
                dir={dirFor("activity")}
                onClick={() => toggle("activity")}
              />
            </TableHead>
            <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((c) => {
            const status = projectStatusVariant(c.status, lang);
            return (
              <TableRow key={c.id}>
                <TableCell>
                  <Link
                    href={`/app/contracts/${c.id}`}
                    className="font-medium text-sm hover:underline"
                  >
                    {c.title}
                  </Link>
                  {c.validUntil ? (
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {t("Berlaku s/d", "Valid until")}{" "}
                      {new Date(c.validUntil).toLocaleDateString(
                        lang === "en" ? "en-US" : "id-ID",
                      )}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-sm">
                  <Link
                    href={`/app/clients/${c.clientId}`}
                    className="text-slate-600 hover:underline"
                  >
                    {c.clientName}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-xs text-slate-500">
                  {activityLabel(c, t, lang)}
                </TableCell>
                <TableCell className="text-right">
                  {canWrite &&
                  (c.status === "draft" ||
                    c.status === "sent" ||
                    c.status === "viewed") ? (
                    <SendContractButton
                      contractId={c.id}
                      status={c.status}
                      compact
                      labelSend={t("Kirim", "Send")}
                      labelResend={t("Kirim ulang", "Resend")}
                      labelSending={t("Mengirim...", "Sending...")}
                      labelCopy={t("Salin", "Copy")}
                      labelCopied={t("Disalin", "Copied")}
                      successMessage={t(
                        "Kontrak siap dibagikan. Salin tautan ke klien.",
                        "Contract ready to share. Copy the link for your client.",
                      )}
                    />
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                      <Link href={`/app/contracts/${c.id}`}>
                        {t("Buka", "Open")}
                      </Link>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
