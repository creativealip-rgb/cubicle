import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { contracts, clients } from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { CreateContractButton } from "@/components/contracts/create-contract-button";
import { ContractsListTable } from "@/components/contracts/contracts-list-table";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { EmptyState } from "@/components/empty-state";
import { getCurrentLang, createT } from "@/lib/i18n";
import { FileSignature } from "lucide-react";

const STATUS_TABS = [
  "all",
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "expired",
  "revoked",
] as const;

export default async function ContractsPage({
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

  const conditions = [eq(contracts.workspaceId, workspaceId)];
  if (statusFilter !== "all") {
    conditions.push(eq(contracts.status, statusFilter));
  }

  const rows = await db
    .select({
      id: contracts.id,
      title: contracts.title,
      status: contracts.status,
      sentAt: contracts.sentAt,
      viewedAt: contracts.viewedAt,
      signedAt: contracts.signedAt,
      declinedAt: contracts.declinedAt,
      validUntil: contracts.validUntil,
      createdAt: contracts.createdAt,
      updatedAt: contracts.updatedAt,
      clientId: contracts.clientId,
      clientName: clients.name,
      clientEmail: clients.email,
    })
    .from(contracts)
    .innerJoin(clients, eq(clients.id, contracts.clientId))
    .where(and(...conditions))
    .orderBy(desc(contracts.createdAt))
    .limit(100);

  const clientsList = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(and(eq(clients.workspaceId, workspaceId), eq(clients.status, "active")))
    .orderBy(clients.name);

  const countRows = await db
    .select({
      status: contracts.status,
      count: sql<number>`count(*)::int`,
    })
    .from(contracts)
    .where(eq(contracts.workspaceId, workspaceId))
    .groupBy(contracts.status);

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
    signed: t("Ditandatangani", "Signed"),
    declined: t("Ditolak", "Declined"),
    expired: t("Kedaluwarsa", "Expired"),
    revoked: t("Dicabut", "Revoked"),
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">
            {t("Kontrak", "Contracts")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t(
              "Kirim kontrak ke klien. Mereka tanda tangan di browser. Kamu dapat jejak audit.",
              "Send contracts to clients. They sign in browser. You get an audit trail.",
            )}
          </p>
        </div>
        {canWrite && (
          <CreateContractButton clients={clientsList} workspaceId={workspaceId} />
        )}
      </div>

      <StatusFilterTabs
        activeValue={statusFilter}
        hideEmpty={false}
        tabs={STATUS_TABS.map((s) => ({
          value: s,
          label: tabLabel[s],
          href: s === "all" ? "/app/contracts" : `/app/contracts?status=${s}`,
          count: counts[s] ?? 0,
          alwaysShow: s === "all" || s === "draft" || s === "sent" || s === "signed",
        }))}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title={
            statusFilter === "all"
              ? t("Belum ada kontrak", "No contracts yet")
              : t("Tidak ada kontrak", "No contracts")
          }
          description={
            statusFilter === "all"
              ? t(
                  "Buat kontrak pertama untuk mulai tanda tangan elektronik.",
                  "Create your first one to start electronic signing.",
                )
              : t(
                  "Tidak ada kontrak dengan status ini.",
                  "No contracts with this status.",
                )
          }
          actionNode={undefined}
        />
      ) : (
        <ContractsListTable rows={rows} canWrite={canWrite} />
      )}
    </div>
  );
}
