import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { projects, clients, tasks, workspaceMembers, users } from "@/db/schema";
import { eq, and, desc, sql, SQL } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import Link from "next/link";
import {
  Plus,
  MoreHorizontal,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { ProjectCreateDialog } from "@/components/projects/project-create-dialog";
import { ProjectFilters } from "@/components/projects/project-filters";
import { getCurrentLang, createT, getLocale } from "@/lib/i18n";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Suspense } from "react";

const STATUS_TABS = [
  "all",
  "active",
  "draft",
  "on_hold",
  "completed",
  "cancelled",
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
  projectId?: string;
}): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.projectId) params.set("projectId", filters.projectId);
  const qs = params.toString();
  return qs ? `/app/projects?${qs}` : "/app/projects";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{
    clientId?: string;
    projectId?: string;
    status?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const locale = getLocale(lang);
  const PROJECT_STATUS_LABELS: Record<string, string> = {
    draft: t("Draf", "Draft"),
    active: t("Aktif", "Active"),
    on_hold: t("Ditunda", "On Hold"),
    completed: t("Selesai", "Completed"),
    cancelled: t("Dibatalkan", "Cancelled"),
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
  const projectId = isUuid(params.projectId) ? params.projectId : undefined;

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

  const projectOptions = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  // Counts per status (respect client/project filters)
  const statusCountWhere: SQL[] = [eq(projects.workspaceId, workspaceId)];
  if (clientId) statusCountWhere.push(eq(projects.clientId, clientId));
  if (projectId) statusCountWhere.push(eq(projects.id, projectId));

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
  if (projectId) whereClauses.push(eq(projects.id, projectId));

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

  const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    draft: "bg-slate-400",
    on_hold: "bg-amber-500",
    completed: "bg-blue-500",
    cancelled: "bg-red-400",
  };

  const filtersForHref = {
    status: statusTab,
    clientId,
    projectId,
  };

  const hasExtraFilters = Boolean(clientId || projectId);
  const selectedClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : undefined;
  const selectedProject = projectId
    ? projectOptions.find((p) => p.id === projectId)
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

      <Tabs defaultValue={statusTab} className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1 lg:w-auto">
            {STATUS_TABS.map((tab) => {
              const active = tab === statusTab;
              const countVal = tabCount(tab);
              // Always show core tabs; hide empty niche ones only when not active
              if (
                !active &&
                countVal === 0 &&
                tab !== "all" &&
                tab !== "active" &&
                tab !== "draft"
              ) {
                return null;
              }
              return (
                <TabsTrigger
                  key={tab}
                  value={tab}
                  asChild
                  className="gap-1.5 data-[state=active]:shadow"
                >
                  <Link href={buildProjectsHref({ ...filtersForHref, status: tab })}>
                    <span>{tabLabel(tab)}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] tabular-nums",
                        active
                          ? "bg-primary/10 text-primary"
                          : "bg-background/80 text-muted-foreground",
                      )}
                    >
                      {countVal}
                    </span>
                  </Link>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <Suspense fallback={null}>
            <ProjectFilters
              clients={clientOptions}
              projects={projectOptions}
              current={{
                status: statusTab,
                clientId,
                projectId,
              }}
            />
          </Suspense>
        </div>
      </Tabs>

      {hasExtraFilters && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("Filter aktif:", "Active filters:")}{" "}
          {selectedClient?.name ?? t("Semua klien", "All clients")}
          {" · "}
          {selectedProject?.name ?? t("Semua proyek", "All projects")}
        </p>
      )}

      <div className="rounded-lg border bg-card">
        <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
          <div className="col-span-3">{t("Proyek", "Project")}</div>
          <div className="col-span-2">{t("Klien", "Client")}</div>
          <div className="col-span-2">{t("Status", "Status")}</div>
          <div className="col-span-2">{t("Progres", "Progress")}</div>
          <div className="col-span-2">{t("Jatuh Tempo", "Due")}</div>
          <div className="col-span-1 text-right">{t("Aksi", "Actions")}</div>
        </div>

        {projectsList.length === 0 && (
          <EmptyState
            icon={Plus}
            title={t("Belum ada proyek", "No projects yet")}
            description={
              hasExtraFilters || statusTab !== "all"
                ? t(
                    "Tidak ada proyek untuk filter ini. Coba ubah status, klien, atau proyek.",
                    "No projects match these filters. Try another status, client, or project.",
                  )
                : t(
                    "Buat proyek pertama untuk mulai pantau pekerjaan.",
                    "Create your first project to start tracking work.",
                  )
            }
          />
        )}

        <div className="md:hidden divide-y">
          {projectsList.map((project) => (
            <div key={project.id} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                    {project.name}
                  </Link>
                  <div className="text-sm text-muted-foreground truncate">
                    {project.clientName || "—"}
                  </div>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`} />
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </Badge>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("Progres", "Progress")}</span>
                  <span>{project.doneTasks}/{project.totalTasks}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
                    style={{
                      width: `${project.totalTasks > 0 ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {project.dueDate ? (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(project.dueDate).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
                {project.clientVisible && (
                  <Badge variant="outline" className="text-[10px]">{t("Terlihat klien", "Client visible")}</Badge>
                )}
              </div>
            </div>
          ))}
        </div>

        {projectsList.map((project) => (
          <div
            key={project.id}
            className="hidden md:grid grid-cols-12 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
          >
            <div className="col-span-3">
              <Link href={`/app/projects/${project.id}`} className="font-medium hover:underline">
                {project.name}
              </Link>
              {project.clientVisible && (
                <Badge variant="outline" className="ml-2 text-[10px]">{t("Terlihat klien", "Client visible")}</Badge>
              )}
            </div>
            <div className="col-span-2 text-sm text-muted-foreground truncate">
              {project.clientName || "—"}
            </div>
            <div className="col-span-2">
              <Badge variant="outline" className="text-xs gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`} />
                {PROJECT_STATUS_LABELS[project.status] ?? project.status}
              </Badge>
            </div>
            <div className="col-span-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
                    style={{
                      width: `${project.totalTasks > 0 ? Math.round((project.doneTasks / project.totalTasks) * 100) : 0}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {project.doneTasks}/{project.totalTasks}
                </span>
              </div>
            </div>
            <div className="col-span-2 text-xs text-muted-foreground">
              {project.dueDate ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(project.dueDate).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                </span>
              ) : (
                "—"
              )}
            </div>
            <div className="col-span-1 text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/app/projects/${project.id}`}>{t("Lihat Detail", "View Details")}</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/app/tasks?projectId=${project.id}`}>{t("Lihat Tugas", "View Tasks")}</Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
