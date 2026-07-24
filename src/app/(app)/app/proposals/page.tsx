import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Plus, FileText } from "lucide-react";
import { ProposalsListTable } from "@/components/proposals/proposals-list-table";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { getCurrentLang, createT } from "@/lib/i18n";

const STATUS_TABS = ["all", "draft", "sent", "viewed", "accepted", "declined", "expired"] as const;

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
          <h1 className="app-page-title">
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

      <StatusFilterTabs
        activeValue={statusFilter}
        hideEmpty={false}
        tabs={STATUS_TABS.map((s) => ({
          value: s,
          label: tabLabel[s],
          href: s === "all" ? "/app/proposals" : `/app/proposals?status=${s}`,
          count: counts[s] ?? 0,
          alwaysShow: s === "all" || s === "draft" || s === "sent",
        }))}
      />

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
        <ProposalsListTable rows={rows} canWrite={canWrite} />
      )}
    </div>
  );
}
