import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, workspaceMembers, users } from "@/db/schema";
import { eq, and, desc, sql, SQL } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { ProjectFilters } from "@/components/projects/project-filters";
import { ProjectsListTable } from "@/components/projects/projects-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import { Suspense } from "react";

const STATUS_TABS = [
  "all",
  "active",
  "draft",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function parseStatusTab(raw?: string): StatusTab {
  if (raw && (STATUS_TABS as readonly string[]).includes(raw)) {
    return raw as StatusTab;
  }
  return "all";
}

function isUuid(value?: string): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function buildProjectsHref(filters: {
  status: StatusTab;
  clientId?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  const qs = params.toString();
  return qs ? `/app/projects?${qs}` : "/app/projects";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    status?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    draft: t("Draf", "Draft"),
    active: t("Aktif", "Active"),
    on_hold: t("Ditunda", "On Hold"),
    completed: t("Selesai", "Completed"),
    cancelled: t("Dibatalkan", "Cancelled"),
    archived: t("Diarsipkan", "Archived"),
  };
  const tabLabel = (tab: StatusTab) => {
    if (tab === "all") return t("Semua", "All");
    return PROJECT_STATUS_LABELS[tab] ?? tab;
  };

  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";
  const params = await searchParams;
  const statusTab = parseStatusTab(params.status);
  const clientId = isUuid(params.clientId) ? params.clientId : undefined;

  // Plan limit (per-user free plan: max 5 projects)
  const [userPlan] = await db.select({ plan: users.plan }).from(users).where(eq(users.id, user.id)).limit(1);
  const currentPlan = userPlan?.plan ?? "free";
  const [{ projectCount }] = await db
    .select({ projectCount: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId));
  const projectLimit = 5;
  const isAtLimit = currentPlan === "free" && projectCount >= projectLimit;

  const clientOptions = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  // Counts per status (respect client filter)
  const statusCountWhere: SQL[] = [eq(projects.workspaceId, workspaceId)];
  if (clientId) statusCountWhere.push(eq(projects.clientId, clientId));

  const statusCountRows = await db
    .select({
      status: projects.status,
      total: sql<number>`count(*)::int`,
    })
    .from(projects)
    .where(and(...statusCountWhere))
    .groupBy(projects.status);

  const countsByStatus = Object.fromEntries(
    statusCountRows.map((row) => [row.status, Number(row.total) || 0]),
  ) as Record<string, number>;
  const totalAll = Object.values(countsByStatus).reduce((sum, n) => sum + n, 0);
  const tabCount = (tab: StatusTab) =>
    tab === "all" ? totalAll : countsByStatus[tab] ?? 0;

  const whereClauses: SQL[] = [eq(projects.workspaceId, workspaceId)];
  if (statusTab !== "all") {
    whereClauses.push(eq(projects.status, statusTab));
  }
  if (clientId) whereClauses.push(eq(projects.clientId, clientId));

  const projectsList = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      clientId: projects.clientId,
      clientName: clients.name,
      totalTasks: sql<number>`count(${tasks.id})::int`,
      doneTasks: sql<number>`count(case when ${tasks.status} = 'done' then 1 end)::int`,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(tasks, eq(tasks.projectId, projects.id))
    .where(and(...whereClauses))
    .groupBy(projects.id, clients.name)
    .orderBy(desc(projects.createdAt));

  const filtersForHref = {
    status: statusTab,
    clientId,
  };

  const hasExtraFilters = Boolean(clientId);
  const selectedClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : undefined;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("Proyek", "Projects")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("Pantau pipeline proyekmu", "Track your project pipeline")}
          </p>
        </div>
        {canWrite && (
          <ProjectCreateDialog
            clients={clientOptions}
            isAtLimit={isAtLimit}
            projectCount={projectCount}
            projectLimit={projectLimit}
          />
        )}
      </div>

      {isAtLimit && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-amber-900">
                {t("Batas free plan tercapai", "Free plan limit reached")}
              </p>
              <p className="text-sm text-amber-700 mt-1">
                {t(
                  `Kamu punya ${projectCount}/${projectLimit} proyek. Upgrade ke Solo untuk unlimited proyek.`,
                  `You have ${projectCount}/${projectLimit} projects. Upgrade to Solo for unlimited projects.`,
                )}
              </p>
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
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <StatusFilterTabs
            activeValue={statusTab}
            tabs={STATUS_TABS.map((tab) => ({
              value: tab,
              label: tabLabel(tab),
              href: buildProjectsHref({ ...filtersForHref, status: tab }),
              count: tabCount(tab),
              alwaysShow: tab === "all" || tab === "active" || tab === "draft",
            }))}
          />

          <Suspense fallback={null}>
            <ProjectFilters
              clients={clientOptions}
              current={{
                status: statusTab,
                clientId,
              }}
            />
          </Suspense>
        </div>
        </div>

      {hasExtraFilters && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("Filter aktif:", "Active filters:")}{" "}
          {selectedClient?.name ?? t("Semua klien", "All clients")}
        </p>
      )}

      <ProjectsListTable
        projects={projectsList}
        hasExtraFilters={hasExtraFilters}
        statusTab={statusTab}
      />
    </div>
  );
}
