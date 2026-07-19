"use client";

import { useMemo } from "react";
import Link from "next/link";
import { MoreHorizontal, Clock, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";

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
  on_hold: "bg-amber-500",
  completed: "bg-blue-500",
  cancelled: "bg-red-400",
  archived: "bg-slate-500",
};

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
      progress: (r: ProjectListItem) =>
        r.totalTasks > 0 ? r.doneTasks / r.totalTasks : 0,
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

  return (
    <div className="rounded-lg border bg-card">
      <div className="hidden md:grid grid-cols-12 gap-4 p-3 text-xs font-medium text-muted-foreground border-b">
        <div className="col-span-3">
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
        <div className="col-span-1 text-right">{t("Aksi", "Actions")}</div>
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon={Plus}
          title={t("Belum ada proyek", "No projects yet")}
          description={
            hasExtraFilters || statusTab !== "all"
              ? t(
                  "Tidak ada proyek untuk filter ini. Coba ubah status, klien, atau paket.",
                  "No projects match these filters. Try another status, client, or package.",
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

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t("Progres", "Progress")}</span>
                <span>
                  {project.doneTasks}/{project.totalTasks}
                </span>
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
                    {new Date(project.dueDate).toLocaleDateString(locale, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                ) : (
                  "—"
                )}
              </span>
              {project.clientVisible && (
                <Badge variant="outline" className="text-[10px]">
                  {t("Terlihat klien", "Client visible")}
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      {sorted.map((project) => (
        <div
          key={project.id}
          className="hidden md:grid grid-cols-12 gap-4 p-3 items-center border-b last:border-0 hover:bg-muted/50 transition-colors"
        >
          <div className="col-span-3">
            <Link
              href={`/app/projects/${project.id}`}
              className="font-medium hover:underline"
            >
              {project.name}
            </Link>
            {project.clientVisible && (
              <Badge variant="outline" className="ml-2 text-[10px]">
                {t("Terlihat klien", "Client visible")}
              </Badge>
            )}
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
                {new Date(project.dueDate).toLocaleDateString(locale, {
                  month: "short",
                  day: "numeric",
                })}
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
                  <Link href={`/app/projects/${project.id}`}>
                    {t("Lihat Detail", "View Details")}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/app/tasks?projectId=${project.id}`}>
                    {t("Lihat Tugas", "View Tasks")}
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  );
}
