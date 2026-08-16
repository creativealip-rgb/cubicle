import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, workspaceMembers, users } from "@/db/schema";
import { eq, and, desc, sql, SQL, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { ProjectsListTable } from "@/components/projects/projects-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";
import { getPlanYearlyLabel } from "@/lib/billing-pricing";
import { BILLING_PLANS } from "@/lib/billing-plans";
import {
  PROJECT_STATUS_TABS,
  PROJECT_STATUS_TAB_VALUES,
  buildProjectsHref,
  parseBillingType,
  type ProjectStatusTab,
} from "@/lib/project-list-filters";
import { ActiveFilterSummary } from "@/components/ui/active-filter-summary";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

function parseStatusTab(raw?: string): ProjectStatusTab {
  if (raw && (PROJECT_STATUS_TABS as readonly string[]).includes(raw)) {
    return raw as ProjectStatusTab;
  }
  return "active";
}

function isUuid(value?: string): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    status?: string;
    billingType?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    active: t("Aktif", "Active"),
    on_hold: t("Ditunda", "On Hold"),
    completed: t("Selesai", "Completed"),
  };
  const tabLabel = (tab: ProjectStatusTab) => {

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
  const billingType = parseBillingType(params.billingType);

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

  const countRows = await db
    .select({ status: projects.status, count: sql<number>`count(*)::int` })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .groupBy(projects.status);

  const statusCounts: Record<ProjectStatusTab, number> = { active: 0, on_hold: 0, completed: 0 };
  for (const row of countRows) {
    const n = Number(row.count) || 0;
    if (PROJECT_STATUS_TAB_VALUES.active.includes(row.status)) statusCounts.active += n;
    else if (row.status === "on_hold") statusCounts.on_hold = n;
    else if (row.status === "completed") statusCounts.completed = n;
  }

  const whereClauses: SQL[] = [eq(projects.workspaceId, workspaceId)];
  whereClauses.push(
    inArray(
      projects.status,
      PROJECT_STATUS_TAB_VALUES[statusTab] as readonly ("active" | "on_hold" | "completed" | "draft" | "cancelled" | "archived")[],
    ),
  );
  if (clientId) whereClauses.push(eq(projects.clientId, clientId));
  if (billingType === "package") whereClauses.push(eq(projects.billingType, "package"));
  else if (billingType) whereClauses.push(eq(projects.billingModel, billingType));

  const projectsList = await db
    .select({
      id: projects.id,
      name: projects.name,
      status: projects.status,
      dueDate: projects.dueDate,
      clientVisible: projects.clientVisible,
      billingType: projects.billingType,
      billingModel: projects.billingModel,
      clientId: projects.clientId,
      clientName: clients.name,
      totalTasks: sql<number>`count(distinct ${tasks.id})::int`,
      doneTasks: sql<number>`count(distinct case when ${tasks.status} = 'done' then ${tasks.id} end)::int`,
      trackedMinutes: sql<number>`coalesce((select sum(te.duration_minutes) from time_entries te where te.project_id = ${projects.id}), 0)::int`,
      packageHours: sql<number | null>`(select p.hours from packages p where p.id = ${projects.selectedPackageId})`,
      retainerIncludedMinutes: projects.retainerIncludedMinutes,
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
    billingType,
  };

  const hasExtraFilters = Boolean(clientId || billingType);
  const selectedClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : undefined;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Proyek", "Projects")}</h1>
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

      <StatusFilterTabs
        activeValue={statusTab}
        hideEmpty={false}
        tabs={PROJECT_STATUS_TABS.map((tab) => ({
          value: tab,
          label: tabLabel(tab),
          href: buildProjectsHref({ ...filtersForHref, status: tab }),
          count: statusCounts[tab] ?? 0,
          alwaysShow: true,
        }))}
      />

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
                {t(`Upgrade ke Solo — ${getPlanYearlyLabel(BILLING_PLANS.solo)}/tahun`, `Upgrade to Solo — ${getPlanYearlyLabel(BILLING_PLANS.solo)}/year`)}
              </Link>
            </Button>
          </div>
        </div>
      )}

      <ActiveFilterSummary basePath="/app/projects" filters={[
        { key: "clientId", label: t("Klien", "Client"), value: selectedClient?.name },
        { key: "billingType", label: t("Model", "Model"), value: billingType === "fixed_price" ? "Fixed Price" : billingType === "hourly" ? t("Per Jam", "Hourly") : billingType === "retainer" ? "Retainer" : billingType === "package" ? t("Paket", "Package") : undefined },
      ]} />

      <ProjectsListTable
        projects={projectsList}
        clients={clientOptions}
        currentClientId={clientId}
        hasExtraFilters={hasExtraFilters}
        billingType={billingType}
        billingTypeHrefs={{
          all: buildProjectsHref({ ...filtersForHref, billingType: undefined }),
          fixed_price: buildProjectsHref({ ...filtersForHref, billingType: "fixed_price" }),
          hourly: buildProjectsHref({ ...filtersForHref, billingType: "hourly" }),
          retainer: buildProjectsHref({ ...filtersForHref, billingType: "retainer" }),
          package: buildProjectsHref({ ...filtersForHref, billingType: "package" }),
        }}
        canWrite={canWrite}
      />
    </div>
  );
}
