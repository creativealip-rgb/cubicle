"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";

export type ProjectListItem = {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  dueDate: string | null;
  clientVisible: boolean;
  totalTasks: number;
  doneTasks: number;
};

const STATUS_ORDER = [
  "active",
  "review",
  "draft",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
] as const;

type SortKey = "name" | "client" | "status" | "progress" | "dueDate";

const statusColors: Record<string, string> = {
  draft: "bg-slate-400",
  active: "bg-emerald-500",
  review: "bg-violet-500",
  on_hold: "bg-amber-500",
  completed: "bg-green-600",
  cancelled: "bg-red-400",
  archived: "bg-slate-500",
};

function progressPct(project: ProjectListItem) {
  if (project.totalTasks <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((project.doneTasks / project.totalTasks) * 100)));
}

function dueDays(dueDate: string | null) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

function dueTone(dueDate: string | null, status: string) {
  if (!dueDate || status === "archived" || status === "cancelled") {
    return "text-muted-foreground";
  }
  const days = dueDays(dueDate) ?? 0;
  if (days < 0) return status === "completed" ? "text-green-700 font-medium" : "text-red-600 font-semibold";
  if (days <= 14) return "text-amber-700 font-semibold";
  return "text-muted-foreground";
}

function ProgressBar({ project }: { project: ProjectListItem }) {
  const pct = progressPct(project);
  return (
    <div className="relative h-5 w-full overflow-hidden rounded-full bg-muted shadow-inner">
      <div
        className={cn("h-full rounded-full transition-all", statusColors[project.status] ?? "bg-slate-400")}
        style={{ width: `${pct}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold leading-none text-slate-700 mix-blend-multiply">
        {pct}%
      </div>
    </div>
  );
}

export function ProjectsListTable({
  projects,
  hasExtraFilters,
  statusTab,
}: {
  projects: ProjectListItem[];
  hasExtraFilters: boolean;
  statusTab: string;
}) {
  const { t, locale } = useT();

  const statusLabels: Record<string, string> = {
    draft: t("Draf", "Draft"),
    active: t("Aktif", "Active"),
    review: t("Review", "Review"),
    on_hold: t("Ditunda", "On Hold"),
    completed: t("Selesai", "Completed"),
    cancelled: t("Dibatalkan", "Cancelled"),
    archived: t("Diarsipkan", "Archived"),
  };

  const getters = useMemo(
    () => ({
      name: (r: ProjectListItem) => r.name,
      client: (r: ProjectListItem) => r.clientName ?? "",
      status: (r: ProjectListItem) => r.status,
      progress: (r: ProjectListItem) => progressPct(r),
      dueDate: (r: ProjectListItem) => r.dueDate,
    }),
    [],
  );

  const orders = useMemo(() => ({ status: STATUS_ORDER }), []);
  const { sorted, toggle, dirFor } = useTableSort<ProjectListItem, SortKey>(
    projects,
    getters,
    orders,
  );

  function formatDue(project: ProjectListItem) {
    if (!project.dueDate) return "—";
    const base = new Date(project.dueDate).toLocaleDateString(locale, {
      month: "short",
      day: "numeric",
    });
    if (project.status === "archived" || project.status === "cancelled") return base;
    const days = dueDays(project.dueDate);
    if (days === null) return base;
    if (days < 0) {
      return project.status === "completed"
        ? `${base} · ${t("selesai", "done")}`
        : `${base} · ${t("lewat", "overdue")}`;
    }
    if (days === 0) return `${base} · ${t("hari ini", "today")}`;
    if (days <= 14) return `${base} · ${days} ${t("hari", "days")}`;
    return base;
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
        <div className="col-span-4">
          <SortableHeader
            as="div"
            label={t("Proyek", "Project")}
            dir={dirFor("name")}
            onClick={() => toggle("name")}
            className="text-xs"
          />
        </div>
        <div className="col-span-2">
          <SortableHeader
            as="div"
            label={t("Klien", "Client")}
            dir={dirFor("client")}
            onClick={() => toggle("client")}
            className="text-xs"
          />
        </div>
        <div className="col-span-2">
          <SortableHeader
            as="div"
            label={t("Status", "Status")}
            dir={dirFor("status")}
            onClick={() => toggle("status")}
            className="text-xs"
          />
        </div>
        <div className="col-span-2">
          <SortableHeader
            as="div"
            label={t("Progres", "Progress")}
            dir={dirFor("progress")}
            onClick={() => toggle("progress")}
            className="text-xs"
          />
        </div>
        <div className="col-span-2">
          <SortableHeader
            as="div"
            label={t("Jatuh Tempo", "Due")}
            dir={dirFor("dueDate")}
            onClick={() => toggle("dueDate")}
            className="text-xs"
          />
        </div>
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon={Plus}
          title={t("Belum ada proyek", "No projects yet")}
          description={
            hasExtraFilters || statusTab !== "all"
              ? t(
                  "Tidak ada proyek untuk filter ini. Coba ubah status atau klien.",
                  "No projects match these filters. Try another status or client.",
                )
              : t(
                  "Buat proyek pertama untuk mulai pantau pekerjaan.",
                  "Create your first project to start tracking work.",
                )
          }
        />
      )}

      <div className="md:hidden divide-y">
        {sorted.map((project) => (
          <div key={project.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/app/projects/${project.id}`}
                  className="font-medium hover:underline"
                >
                  {project.name}
                </Link>
                <div className="text-sm text-muted-foreground truncate">
                  {project.clientName || "—"}
                </div>
              </div>
              <Badge variant="outline" className="text-xs shrink-0 gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
                />
                {statusLabels[project.status] ?? project.status}
              </Badge>
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">
                {t("Progres", "Progress")}
              </div>
              <ProgressBar project={project} />
            </div>

            <div className={cn("flex items-center gap-1 text-xs", dueTone(project.dueDate, project.status))}>
              <Clock className="h-3 w-3" />
              {formatDue(project)}
            </div>
          </div>
        ))}
      </div>

      {sorted.map((project, index) => (
        <div
          key={project.id}
          className={`hidden md:grid grid-cols-12 gap-4 p-3 items-center border-b border-slate-200 last:border-0 hover:bg-slate-100/70 transition-colors ${index % 2 === 1 ? "!bg-slate-50" : "!bg-white"}`}
        >
          <div className="col-span-4">
            <Link
              href={`/app/projects/${project.id}`}
              className="font-medium hover:underline"
            >
              {project.name}
            </Link>
          </div>
          <div className="col-span-2 text-sm text-muted-foreground truncate">
            {project.clientName || "—"}
          </div>
          <div className="col-span-2">
            <Badge variant="outline" className="text-xs gap-1.5">
              <span
                className={`h-1.5 w-1.5 rounded-full ${statusColors[project.status] ?? "bg-slate-400"}`}
              />
              {statusLabels[project.status] ?? project.status}
            </Badge>
          </div>
          <div className="col-span-2">
            <ProgressBar project={project} />
          </div>
          <div className={cn("col-span-2 text-xs", dueTone(project.dueDate, project.status))}>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDue(project)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
