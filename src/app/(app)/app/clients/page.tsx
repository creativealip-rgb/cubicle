import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { clients, projects, users, workspaceMembers } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import {
  Plus,
  Search,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { ClientsListTable } from "@/components/clients/clients-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

interface SearchParams {
  search?: string;
  status?: string;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  // Check plan for limit enforcement (plan is per-user)
  const [userPlan] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, user.id)).limit(1);
  const currentPlan = userPlan?.plan ?? "free";
  const [{ clientCount }] = await db.select({ clientCount: sql<number>`count(*)::int` }).from(clients).where(eq(clients.workspaceId, workspaceId));
  const isAtLimit = currentPlan === "free" && clientCount >= 3;

  const params = await searchParams;
  const search = params.search ?? "";
  const statusFilter = params.status ?? "active";

  const whereClauses = [eq(clients.workspaceId, workspaceId)];

  if (statusFilter === "active") {
    whereClauses.push(eq(clients.status, "active"));
  } else if (statusFilter === "inactive") {
    whereClauses.push(eq(clients.status, "inactive"));
  } else if (statusFilter === "archived") {
    whereClauses.push(eq(clients.status, "archived"));
  }

  // Fetch clients with project counts
  const clientsList = await db
    .select({
      id: clients.id,
      clientNumber: clients.clientNumber,
      name: clients.name,
      companyName: clients.companyName,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
      tags: clients.tags,
      portalEnabled: clients.portalEnabled,
      portalSlug: clients.portalSlug,
      portalSlugEnabled: clients.portalSlugEnabled,
      createdAt: clients.createdAt,
      projectCount: sql<number>`count(${projects.id})::int`,
    })
    .from(clients)
    .leftJoin(projects, eq(projects.clientId, clients.id))
    .where(and(...whereClauses))
    .groupBy(clients.id)
    .orderBy(desc(clients.createdAt));

  // Filter by search term in app (client-side would be ideal, but server filtering for MVP)
  const filtered = search
    ? clientsList.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          (c.companyName?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (c.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (c.clientNumber?.toLowerCase().includes(search.toLowerCase()) ?? false)
      )
    : clientsList;

  // Get counts for tabs
  const [counts] = await db
    .select({
      active: sql<number>`count(case when ${clients.status} = 'active' then 1 end)::int`,
      inactive: sql<number>`count(case when ${clients.status} = 'inactive' then 1 end)::int`,
      archived: sql<number>`count(case when ${clients.status} = 'archived' then 1 end)::int`,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId));

  const tabCounts = counts ?? { active: 0, inactive: 0, archived: 0 };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("Klien", "Clients")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Kelola hubungan klienmu", "Manage your client relationships")}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <a href="/api/clients/export/xlsx" download>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">{t("Unduh Excel", "Download Excel")}</span>
              <span className="sm:hidden">XLSX</span>
            </a>
          </Button>
          {canWrite && (
            isAtLimit ? (
              <Button size="sm" className="gap-1" disabled>
                <Plus className="h-4 w-4" />
                {t("Upgrade dulu", "Upgrade first")}
              </Button>
            ) : (
              <Button size="sm" className="gap-1" asChild>
                <Link href="/app/clients/new">
                  <Plus className="h-4 w-4" />
                  <span className="sm:inline">{t("Tambah Klien", "Add Client")}</span>
                </Link>
              </Button>
            )
          )}
        </div>
      </div>

      {isAtLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-900">{t("Batas free plan tercapai", "Free plan limit reached")}</p>
              <p className="text-sm text-amber-700 mt-1">{t(`Kamu punya ${clientCount}/3 klien. Upgrade ke Solo untuk unlimited klien.`, `You have ${clientCount}/3 clients. Upgrade to Solo for unlimited clients.`)}</p>
            </div>
            <Button size="sm" className="bg-[#6647F0] hover:bg-[#5333DD] shrink-0" asChild>
              <Link href="/app/billing">
                {t("Upgrade ke Solo — Rp 49rb/bln", "Upgrade to Solo — Rp 49k/mo")}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <StatusFilterTabs
            activeValue={statusFilter}
            hideEmpty={false}
            tabs={[
              {
                value: "active",
                label: t("Aktif", "Active"),
                href: search ? `?status=active&search=${encodeURIComponent(search)}` : "?status=active",
                count: tabCounts.active,
                alwaysShow: true,
              },
              {
                value: "inactive",
                label: t("Tidak aktif", "Inactive"),
                href: search
                  ? `?status=inactive&search=${encodeURIComponent(search)}`
                  : "?status=inactive",
                count: tabCounts.inactive,
                alwaysShow: true,
              },
              {
                value: "archived",
                label: t("Arsip", "Archived"),
                href: search
                  ? `?status=archived&search=${encodeURIComponent(search)}`
                  : "?status=archived",
                count: tabCounts.archived,
                alwaysShow: true,
              },
            ]}
          />

          <form className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={search}
              placeholder={t("Cari klien...", "Search clients...")}
              className="pl-8"
            />
            {statusFilter !== "active" && (
              <input type="hidden" name="status" value={statusFilter} />
            )}
          </form>
        </div>

        <ClientsListTable
          clients={filtered}
          clientCount={clientCount}
          canWrite={canWrite}
          isAtLimit={isAtLimit}
        />
      </div>
    </div>
  );
}
