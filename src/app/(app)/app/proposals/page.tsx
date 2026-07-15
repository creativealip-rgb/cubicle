import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
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
import { Plus, FileText } from "lucide-react";
import { SendProposalButton } from "@/components/proposals/send-proposal-button";
import { formatMoney } from "@/lib/utils";
import { projectStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";

const STATUS_TABS = ["all", "draft", "sent", "viewed", "accepted", "declined", "expired"] as const;

function activityLabel(
  p: {
    status: string;
    sentAt: Date | null;
    viewedAt: Date | null;
    acceptedAt: Date | null;
    declinedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    validUntil: string | null;
  },
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

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const params = await searchParams;
  const statusFilter = STATUS_TABS.includes(params.status as (typeof STATUS_TABS)[number])
    ? (params.status as (typeof STATUS_TABS)[number])
    : "all";

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  const member = await assertWorkspaceMember(db, user.id, workspaceId);
  const canWrite = member.role === "owner" || member.role === "member";

  const conditions = [eq(proposals.workspaceId, workspaceId)];
  if (statusFilter !== "all") {
    conditions.push(eq(proposals.status, statusFilter));
  }

  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      status: proposals.status,
      total: proposals.total,
      currency: proposals.currency,
      validUntil: proposals.validUntil,
      sentAt: proposals.sentAt,
      viewedAt: proposals.viewedAt,
      acceptedAt: proposals.acceptedAt,
      declinedAt: proposals.declinedAt,
      createdAt: proposals.createdAt,
      updatedAt: proposals.updatedAt,
      clientId: clients.id,
      clientName: clients.name,
    })
    .from(proposals)
    .innerJoin(clients, eq(clients.id, proposals.clientId))
    .where(and(...conditions))
    .orderBy(desc(proposals.createdAt))
    .limit(100);

  const countRows = await db
    .select({
      status: proposals.status,
      count: sql<number>`count(*)::int`,
    })
    .from(proposals)
    .where(eq(proposals.workspaceId, workspaceId))
    .groupBy(proposals.status);

  const counts: Record<string, number> = { all: 0 };
  for (const row of countRows) {
    const n = Number(row.count) || 0;
    counts[row.status] = n;
    counts.all += n;
  }

  const tabLabel: Record<string, string> = {
    all: t("Semua", "All"),
    draft: t("Draf", "Draft"),
    sent: t("Terkirim", "Sent"),
    viewed: t("Dilihat", "Viewed"),
    accepted: t("Diterima", "Accepted"),
    declined: t("Ditolak", "Declined"),
    expired: t("Kedaluwarsa", "Expired"),
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("Proposal", "Proposals")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Kirim scope + harga ke calon klien. Setelah diterima, kerja bisa dimulai.",
              "Send scope + pricing to prospects. Once accepted, work can begin.",
            )}
          </p>
        </div>
        {canWrite && (
          <Button asChild>
            <Link href="/app/proposals/new">
              <Plus className="h-4 w-4 mr-1" />
              {t("Proposal baru", "New proposal")}
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => {
          const active = statusFilter === s;
          const count = counts[s] ?? 0;
          return (
            <Button
              key={s}
              asChild
              size="sm"
              variant={active ? "default" : "outline"}
            >
              <Link href={s === "all" ? "/app/proposals" : `/app/proposals?status=${s}`}>
                {tabLabel[s]}
                <span className="ml-1.5 text-[11px] opacity-80">{count}</span>
              </Link>
            </Button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-slate-300 mb-3" />
          <p className="text-sm text-slate-500 mb-4">
            {statusFilter === "all"
              ? t(
                  "Belum ada proposal. Buat proposal untuk mulai kirim scope.",
                  "No proposals yet. Create one to start sending scope.",
                )
              : t(
                  "Tidak ada proposal dengan status ini.",
                  "No proposals with this status.",
                )}
          </p>
          {canWrite && statusFilter === "all" && (
            <Button asChild>
              <Link href="/app/proposals/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("Buat proposal pertama", "Create first proposal")}
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("Judul", "Title")}</TableHead>
                <TableHead>{t("Klien", "Client")}</TableHead>
                <TableHead>{t("Status", "Status")}</TableHead>
                <TableHead className="text-right">{t("Total", "Total")}</TableHead>
                <TableHead>{t("Aktivitas", "Activity")}</TableHead>
                <TableHead className="text-right">{t("Aksi", "Actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const status = projectStatusVariant(p.status, lang);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link
                        href={`/app/proposals/${p.id}`}
                        className="font-medium text-sm hover:underline"
                      >
                        {p.title}
                      </Link>
                      {p.validUntil ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {t("Berlaku s/d", "Valid until")}{" "}
                          {new Date(p.validUntil).toLocaleDateString(
                            lang === "en" ? "en-US" : "id-ID",
                          )}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">
                      <Link
                        href={`/app/clients/${p.clientId}`}
                        className="text-slate-600 hover:underline"
                      >
                        {p.clientName}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {formatMoney(p.total, p.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {activityLabel(p, t, lang)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite &&
                      (p.status === "draft" ||
                        p.status === "sent" ||
                        p.status === "viewed") ? (
                        <SendProposalButton
                          proposalId={p.id}
                          status={p.status}
                          compact
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
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
