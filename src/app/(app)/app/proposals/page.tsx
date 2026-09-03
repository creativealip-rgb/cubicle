import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { proposals, clients, services } from "@/db/schema";
import { listProposalTemplates } from "@/lib/actions/proposal-templates";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { FileText, FileSpreadsheet } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ProposalsListTable } from "@/components/proposals/proposals-list-table";
import { CreateProposalButton } from "@/components/proposals/create-proposal-button";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { EmptyState } from "@/components/empty-state";
import { getCurrentLang, createT } from "@/lib/i18n";
import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";

const STATUS_TABS = ["all", "draft", "sent", "viewed", "accepted", "declined", "expired"] as const;

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; new?: string }>;
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
      clientName: proposals.clientName,
      clientEmail: proposals.clientEmail,
    })
    .from(proposals)
    .leftJoin(clients, eq(clients.id, proposals.clientId))
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

  const ws = await getWorkspaceFullForCurrentUser();
  const clientRows = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")))
    .orderBy(clients.name);
  const serviceRows = await db
    .select({
      id: services.id,
      name: services.name,
      description: services.description,
      defaultPrice: services.defaultPrice,
      defaultUnit: services.defaultUnit,
    })
    .from(services)
    .where(and(eq(services.workspaceId, workspaceId), eq(services.status, "active")))
    .orderBy(services.name);
  const proposalTemplates = await listProposalTemplates();

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
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={FileSpreadsheet}
        title={t("Proposal", "Proposals")}
        description={t(
          "Kirim penawaran scope dan harga ke prospek. Setelah disetujui, proyek siap dieksekusi.",
          "Send scope and pricing estimates to prospects. Once accepted, project execution can begin.",
        )}
        actions={
          canWrite ? (
            <CreateProposalButton
              workspaceId={workspaceId}
              defaultCurrency={ws.defaultCurrency}
              defaultTaxRate={ws.defaultTaxRate ?? "0"}
              clients={clientRows}
              services={serviceRows.map((s) => ({
                id: s.id,
                name: s.name,
                description: s.description ?? "",
                defaultPrice: s.defaultPrice ? Number(s.defaultPrice) : 0,
                defaultUnit: s.defaultUnit ?? "service",
              }))}
              templates={proposalTemplates}
              defaultOpen={params.new === "1"}
            />
          ) : null
        }
      />

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
        <EmptyState
          icon={FileText}
          title={
            statusFilter === "all"
              ? t("Belum ada proposal", "No proposals yet")
              : t("Tidak ada proposal", "No proposals")
          }
          description={
            statusFilter === "all"
              ? t(
                  "Buat proposal untuk mulai kirim scope.",
                  "Create one to start sending scope.",
                )
              : t(
                  "Tidak ada proposal dengan status ini.",
                  "No proposals with this status.",
                )
          }
          action={undefined}
        />
      ) : (
        <ProposalsListTable rows={rows} canWrite={canWrite} />
      )}
    </div>
  );
}
