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
import { formatMoney } from "@/lib/utils";
import { projectStatusVariant } from "@/lib/status-badge";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { FileText } from "lucide-react";

export type ProposalListItem = {
  id: string;
  title: string;
  status: string;
  total: number | string | null;
  currency: string;
  validUntil: string | null;
  sentAt: Date | string | null;
  viewedAt: Date | string | null;
  acceptedAt: Date | string | null;
  declinedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  clientId: string | null;
  clientName: string;
  clientEmail: string | null;
};

const STATUS_ORDER = [
  "draft",
  "sent",
  "viewed",
  "accepted",
  "declined",
  "expired",
] as const;

type SortKey = "title" | "client" | "status" | "total" | "activity";

function activityTs(p: ProposalListItem): number {
  const pick =
    p.status === "accepted"
      ? p.acceptedAt || p.updatedAt || p.createdAt
      : p.status === "declined"
        ? p.declinedAt || p.updatedAt || p.createdAt
        : p.status === "viewed"
          ? p.viewedAt || p.sentAt || p.updatedAt
          : p.status === "sent"
            ? p.sentAt || p.updatedAt || p.createdAt
            : p.status === "expired"
              ? p.validUntil || p.updatedAt
              : p.createdAt;
  const t = new Date(pick as string | Date).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function activityLabel(
  p: ProposalListItem,
  t: (id: string, en: string) => string,
  lang: string,
) {
  const locale = lang === "en" ? "en-US" : "id-ID";
  const fmt = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(locale) : "";

  if (p.status === "accepted") {
    return `${t("Diterima", "Accepted")} ${fmt(p.acceptedAt || p.updatedAt || p.createdAt)}`;
  }
  if (p.status === "declined") {
    return `${t("Ditolak", "Declined")} ${fmt(p.declinedAt || p.updatedAt || p.createdAt)}`;
  }
  if (p.status === "viewed") {
    return `${t("Dilihat", "Viewed")} ${fmt(p.viewedAt || p.sentAt || p.updatedAt)}`;
  }
  if (p.status === "sent") {
    return `${t("Terkirim", "Sent")} ${fmt(p.sentAt || p.updatedAt || p.createdAt)}`;
  }
  if (p.status === "expired") {
    return `${t("Kedaluwarsa", "Expired")} ${fmt(p.validUntil || p.updatedAt)}`;
  }
  if (p.status === "draft") {
    return `${t("Draf", "Draft")} ${fmt(p.createdAt)}`;
  }
  return fmt(p.updatedAt || p.createdAt);
}

export function ProposalsListTable({
  rows,
  canWrite,
}: {
  rows: ProposalListItem[];
  canWrite: boolean;
}) {
  const { t, lang } = useT();

  const getters = useMemo(
    () => ({
      title: (r: ProposalListItem) => r.title,
      client: (r: ProposalListItem) => r.clientName,
      status: (r: ProposalListItem) => r.status,
      total: (r: ProposalListItem) => Number(r.total) || 0,
      activity: (r: ProposalListItem) => activityTs(r),
    }),
    [],
  );

  const orders = useMemo(() => ({ status: STATUS_ORDER }), []);
  const { sorted, toggle, dirFor } = useTableSort<ProposalListItem, SortKey>(
    rows,
    getters,
    orders,
  );

  return (
    <>
      <div className="hidden md:block overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
        <Table className="[&_td]:px-3.5 [&_td]:py-2 [&_th]:px-3.5 [&_th]:py-2">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
              <TableHead>
                <SortableHeader
                  label={t("Judul", "Title")}
                  dir={dirFor("title")}
                  onClick={() => toggle("title")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Klien", "Client")}
                  dir={dirFor("client")}
                  onClick={() => toggle("client")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Status", "Status")}
                  dir={dirFor("status")}
                  onClick={() => toggle("status")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader
                  label={t("Total", "Total")}
                  dir={dirFor("total")}
                  onClick={() => toggle("total")}
                  align="right"
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead>
                <SortableHeader
                  label={t("Aktivitas", "Activity")}
                  dir={dirFor("activity")}
                  onClick={() => toggle("activity")}
                  className="text-[11px] uppercase tracking-wider"
                />
              </TableHead>
              <TableHead className="text-right text-[11px] uppercase tracking-wider">{t("Aksi", "Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((p) => {
              const status = projectStatusVariant(p.status, lang);
              return (
                <TableRow
                  key={p.id}
                  className="border-b border-border transition-colors hover:bg-muted/40"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <FileText className="h-3 w-3" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/app/proposals/${p.id}`}
                          className="text-sm font-semibold text-foreground hover:text-primary transition-colors block truncate max-w-[15rem]"
                        >
                          {p.title}
                        </Link>
                        {p.validUntil ? (
                          <p className="text-[11px] text-muted-foreground">
                            {t("Berlaku s/d", "Valid until")}{" "}
                            {new Date(p.validUntil).toLocaleDateString(
                              lang === "en" ? "en-US" : "id-ID",
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.clientId ? <Link href={`/app/clients/${p.clientId}`} className="text-muted-foreground hover:text-primary hover:underline">{p.clientName}</Link> : <span className="text-muted-foreground">{p.clientName}</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 rounded-full font-medium border-border/80 bg-muted/60 text-muted-foreground">{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold whitespace-nowrap">
                    {formatMoney(p.total, p.currency)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {activityLabel(p, t, lang)}
                  </TableCell>
                  <TableCell className="text-right align-middle">
                    <div className="flex justify-end">
                    {canWrite &&
                    (p.status === "draft" ||
                      p.status === "sent" ||
                      p.status === "viewed") ? (
                      <SendProposalButton
                        proposalId={p.id}
                        status={p.status}
                        compact
                        title={p.title}
                        clientName={p.clientName}
                        clientEmail={p.clientEmail ?? undefined}
                        labelSend={t("Kirim", "Send")}
                        labelResend={t("Kirim ulang", "Resend")}
                        labelSending={t("Mengirim...", "Sending...")}
                        labelCopy={t("Salin", "Copy")}
                        labelCopied={t("Disalin", "Copied")}
                        successMessage={t(
                          "Proposal siap dibagikan. Salin tautan ke klien.",
                          "Proposal ready to share. Copy the link for your client.",
                        )}
                      />
                    ) : (
                      <Button asChild variant="ghost" size="sm" className="h-7 text-xs">
                        <Link href={`/app/proposals/${p.id}`}>
                          {t("Buka", "Open")}
                        </Link>
                      </Button>
                    )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile cards view */}
      <div className="md:hidden space-y-3">
        {sorted.map((p) => {
          const status = projectStatusVariant(p.status, lang);
          return (
            <div key={p.id} className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2.5 shadow-xs transition-colors hover:bg-muted/40">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileText className="h-3 w-3" />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/app/proposals/${p.id}`}
                      className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                    >
                      {p.title}
                    </Link>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.clientName || "—"}
                    </div>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={`gap-1 text-[10px] font-medium rounded-full px-2 py-0 h-5 shrink-0 ${
                    p.status === "accepted"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                      : p.status === "sent" || p.status === "viewed"
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400"
                      : p.status === "rejected"
                      ? "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400"
                      : "border-border/80 bg-muted/60 text-muted-foreground"
                  }`}
                >
                  <span
                    className={`h-1 w-1 rounded-full ${
                      p.status === "accepted"
                        ? "bg-emerald-600"
                        : p.status === "sent" || p.status === "viewed"
                        ? "bg-blue-600"
                        : p.status === "rejected"
                        ? "bg-rose-600"
                        : "bg-muted-foreground"
                    }`}
                  />
                  {status.label}
                </Badge>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                <span className="font-semibold text-foreground text-sm tabular-nums">
                  {formatMoney(p.total, p.currency)}
                </span>
                <div className="flex items-center gap-2">
                  <span>{activityLabel(p, t, lang)}</span>
                  {canWrite &&
                  (p.status === "draft" ||
                    p.status === "sent" ||
                    p.status === "viewed") ? (
                    <SendProposalButton
                      proposalId={p.id}
                      status={p.status}
                      compact
                      title={p.title}
                      clientName={p.clientName}
                      clientEmail={p.clientEmail ?? undefined}
                      labelSend={t("Kirim", "Send")}
                      labelResend={t("Kirim ulang", "Resend")}
                      labelSending={t("Mengirim...", "Sending...")}
                      labelCopy={t("Salin", "Copy")}
                      labelCopied={t("Disalin", "Copied")}
                      successMessage={t(
                        "Proposal siap dibagikan. Salin tautan ke klien.",
                        "Proposal ready to share. Copy the link for your client.",
                      )}
                    />
                  ) : (
                    <Button asChild variant="ghost" size="sm" className="h-6 px-2 text-xs">
                      <Link href={`/app/proposals/${p.id}`}>
                        {t("Buka", "Open")}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
