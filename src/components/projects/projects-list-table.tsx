"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Clock, Plus, FolderKanban } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SortableHeader } from "@/components/ui/sortable-header";
import { useTableSort } from "@/hooks/use-table-sort";
import { useT } from "@/lib/i18n-client";
import { cn } from "@/lib/utils";
import { getProjectProgress, progressTone } from "@/lib/project-progress";
import { projectListStatusVariant, projectStatusDot } from "@/lib/status-badge";
import { UniversalStatusBadge } from "@/components/ui/universal-status-badge";

import type { ProjectBillingType } from "@/lib/project-list-filters";
import { TableHeaderFilter } from "@/components/ui/table-header-filter";
import { ProjectStatusEditDialog } from "@/components/projects/project-status-edit-dialog";

export type ProjectListItem = {
  id: string;
  name: string;
  status: string;
  clientName: string | null;
  dueDate: string | null;
  clientVisible: boolean;
  totalTasks: number;
  doneTasks: number;
  billingType: string;
  billingModel?: string | null;
  trackedMinutes: number;
  packageHours: number | null;
  retainerIncludedMinutes?: number | null;
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

function progressPct(project: ProjectListItem) {
  return getProjectProgress(project).pct;
}

function dueDays(dueDate: string | null) {
  if (!dueDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
}

type DueTone = "muted" | "normal" | "warn" | "danger" | "done";

function dueTone(dueDate: string | null, status: string): DueTone {
  if (!dueDate || status === "archived" || status === "cancelled") return "muted";
  if (status === "completed") return "done";
  const days = dueDays(dueDate) ?? 0;
  if (days < 0) return "danger";
  if (days === 0) return "warn";
  if (days <= 14) return "warn";
  return "normal";
}

const dueChipClass: Record<DueTone, string> = {
  muted: "bg-muted/60 text-muted-foreground",
  normal: "bg-muted/60 text-muted-foreground",
  warn: "bg-amber-100 text-amber-900",
  danger: "bg-red-100 text-red-800",
  done: "bg-emerald-100 text-emerald-800",
};

function ProgressBar({ project, label }: { project: ProjectListItem; label?: string }) {
  const progress = getProjectProgress(project);
  const overdue = project.status !== "completed" && (dueDays(project.dueDate) ?? 0) < 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.pct}
        aria-label={label ?? "Progress"}
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted/80"
      >
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(progress.pct, 0))}%`, backgroundColor: progressTone(progress.pct, overdue) }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-muted-foreground whitespace-nowrap">
        {progress.label}
      </span>
    </div>
  );
}

export function ProjectsListTable({
  projects,
  clients,
  currentClientId,
  hasExtraFilters,
  billingType,
  billingTypeHrefs: _billingTypeHrefs,
  canWrite,
}: {
  projects: ProjectListItem[];
  clients: Array<{ id: string; name: string }>;
  currentClientId?: string;
  hasExtraFilters: boolean;
  billingType?: ProjectBillingType;
  billingTypeHrefs: Record<"all" | ProjectBillingType, string>;
  canWrite: boolean;
}) {
  const { t, locale } = useT();

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
    if (project.status === "completed") return `${base} · ${t("selesai", "done")}`;
    const days = dueDays(project.dueDate);
    if (days === null) return base;
    if (days < 0) return `${base} · ${t("lewat", "overdue")}`;
    if (days === 0) return `${base} · ${t("hari ini", "today")}`;
    if (days <= 14) return `${base} · ${days} ${t("hari", "days")}`;
    return base;
  }

  function StatusPill({ status }: { status: string }) {
    const config = projectListStatusVariant(status, locale === "en-US" ? "en" : "id");
    return (
      <UniversalStatusBadge label={config.label} status={status} />
    );
  }

  function DueCell({ project }: { project: ProjectListItem }) {
    const tone = dueTone(project.dueDate, project.status);
    if (!project.dueDate) {
      return (
        <span className="text-xs text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          —
        </span>
      );
    }
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium",
          dueChipClass[tone],
        )}
      >
        <Clock className="h-3 w-3" />
        {formatDue(project)}
      </span>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/80 bg-card shadow-xs">
      <div className="hidden md:grid grid-cols-12 gap-3 px-3.5 py-2 text-[11px] font-semibold text-muted-foreground bg-muted/40 border-b border-border/80 items-center">
        <div className="col-span-3">
          <SortableHeader
            as="div"
            label={t("Proyek", "Project")}
            dir={dirFor("name")}
            onClick={() => toggle("name")}
            className="text-[11px] uppercase tracking-wider"
          />
        </div>
        <div className="col-span-2">
          <TableHeaderFilter label={t("Klien", "Client")} queryKey="clientId" value={currentClientId} basePath="/app/projects" options={[{ value: "all", label: t("Semua klien", "All clients") }, ...clients.map((client) => ({ value: client.id, label: client.name }))]} className="text-[11px] uppercase tracking-wider" />
        </div>
        <div className="col-span-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{t("Status", "Status")}</span>
        </div>
        <div className="col-span-2">
          <TableHeaderFilter label={t("Progres", "Progress")} queryKey="billingType" value={billingType} basePath="/app/projects" options={[
            { value: "all", label: t("Semua jenis", "All types") }, { value: "fixed_price", label: "Fixed Price" },
            { value: "hourly", label: t("Per Jam", "Hourly") }, { value: "retainer", label: "Retainer" }, { value: "package", label: t("Paket", "Package") },
          ]} className="text-[11px] uppercase tracking-wider" />
        </div>
        <div className="col-span-2">
          <SortableHeader
            as="div"
            label={t("Jatuh Tempo", "Due")}
            dir={dirFor("dueDate")}
            onClick={() => toggle("dueDate")}
            className="text-[11px] uppercase tracking-wider"
          />
        </div>
        <div className="col-span-1 text-right text-[11px] uppercase tracking-wider">{t("Aksi", "Action")}</div>
      </div>

      {projects.length === 0 && (
        <EmptyState
          icon={Plus}
          title={t("Belum ada proyek", "No projects yet")}
          description={
            hasExtraFilters
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

      <div className="md:hidden space-y-3">
        {sorted.map((project) => (
          <div key={project.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-xs transition-colors hover:bg-muted/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  href={`/app/projects/${project.id}`}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {project.name}
                </Link>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {project.clientName || "—"}
                </div>
              </div>
              <StatusPill status={project.status} />
            </div>

            <div className="space-y-1.5">
              <div className="text-xs text-muted-foreground">
                {t("Progres", "Progress")}
              </div>
              <ProgressBar project={project} label={t("Progres", "Progress")} />
            </div>

            <div className="flex items-center justify-between gap-2">
              <DueCell project={project} />
              {canWrite ? <ProjectStatusEditDialog projectId={project.id} projectName={project.name} currentStatus={project.status} /> : null}
            </div>
          </div>
        ))}
      </div>

      {sorted.map((project) => (
        <div
          key={project.id}
          className="hidden md:grid grid-cols-12 gap-3 border-b border-border/60 px-3.5 py-2 items-center transition-colors last:border-0 hover:bg-muted/40"
        >
          <div className="col-span-3 min-w-0 flex items-center gap-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FolderKanban className="h-3 w-3" />
            </div>
            <Link
              href={`/app/projects/${project.id}`}
              className="text-xs font-semibold text-foreground hover:text-primary transition-colors truncate block"
            >
              {project.name}
            </Link>
          </div>
          <div className="col-span-2 text-xs text-muted-foreground truncate">
            {project.clientName || "—"}
          </div>
          <div className="col-span-2">
            <StatusPill status={project.status} />
          </div>
          <div className="col-span-2">
            <ProgressBar project={project} />
          </div>
          <div className="col-span-2">
            <DueCell project={project} />
          </div>
          <div className="col-span-1 flex justify-end">{canWrite ? <ProjectStatusEditDialog projectId={project.id} projectName={project.name} currentStatus={project.status} /> : null}</div>
        </div>
      ))}
    </div>
  );
}
