"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Activity,
  Clock,
  Package,
} from "lucide-react";
import { PortalTaskList } from "./portal-task-list";
import { PortalFileList } from "./portal-file-list";
import { CustomPackageRequestForm } from "./custom-package-request-form";
import { PackageOrderButton } from "./package-order-button";
import { PortalContactButtons } from "./portal-contact";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  billingType: string;
  rate: string | null;
  budget: string | null;
  currency: string | null;
  startDate: string | null;
  finishDate: string | null;
  selectedPackageId: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  updatedAt: string;
  projectId: string;
}

interface FileItem {
  id: string;
  name: string;
  mimeType: string | null;
  sizeBytes: number | null;
  fileType: string;
  createdAt: string;
}

interface TimelineEvent {
  id: string;
  action: string;
  entityType: string;
  createdAt: string;
}

interface HoursSummary {
  totalMinutes: number;
  billableMinutes: number;
  entryCount: number;
  tags: string[];
}

interface TimeEntry {
  id: string;
  description: string | null;
  durationMinutes: number;
  startTime: string | null;
  endTime: string | null;
  billable: boolean;
  tags: string | null;
  userName: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string | null;
  total: string;
  currency: string;
  status: string;
  dueDate: string | null;
  issueDate: string | null;
}

interface SelectedPackage {
  id: string;
  name: string;
  hours: number | null;
  price: string;
  currency: string;
}

interface PackageItem {
  id: string;
  name: string;
  hours: number | null;
  price: string;
  currency: string;
  description: string | null;
  features: string | null;
  badge: string | null;
  sortOrder: number;
  customPrice: string | null;
  minHours: number | null;
  maxHours: number | null;
  allowCustom: boolean;
}

interface CustomRequest {
  id: string;
  projectId: string;
  requestedHours: number;
  estimatedPrice: string | null;
  message: string | null;
  status: string;
  createdAt: Date;
}

interface PackageOrder {
  id: string;
  projectId: string;
  packageName: string;
  hours: number | null;
  price: string;
  currency: string;
  status: string;
  createdAt: string;
}

interface ProjectAccordionProps {
  projects: Project[];
  projectTasksMap: Map<string, Task[]>;
  projectFilesMap: Map<string, FileItem[]>;
  projectTimelineMap: Map<string, TimelineEvent[]>;
  projectHoursMap: Map<string, HoursSummary>;
  byHoursEntriesMap: Map<string, TimeEntry[]>;
  projectInvoicesMap: Map<string, Invoice[]>;
  selectedPackageMap: Map<string, SelectedPackage>;
  projectPackagesMap: Map<string, PackageItem[]>;
  customRequests: CustomRequest[];
  packageOrdersList: PackageOrder[];
  clientVisibleActionLabels: Record<string, string>;
  token: string;
  workspaceId: string;
  ownerWhatsAppPhone?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
}

function formatIDR(amount: number) {
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `Rp ${(amount / 1_000).toFixed(0)}K`;
  return `Rp ${amount.toLocaleString("id-ID")}`;
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function formatCurrency(amount: string | number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "IDR",
  }).format(Number(amount));
}

// ── Portal UX helpers (client-facing, Bahasa Indonesia) ──

// Task progress: how many tasks are done out of total
function taskProgress(tasks: Task[]) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

// Whether any client-visible task is awaiting review (client action)
function hasReviewTask(tasks: Task[]) {
  return tasks.some((t) => t.status === "review");
}

type StatusMeta = {
  label: string;
  badgeClass: string;
  borderClass: string;
};

// Human status in Bahasa Indonesia + color accent.
// `needsReview` bumps an active project to the amber "needs your review" state.
function getProjectStatusMeta(status: string, needsReview: boolean): StatusMeta {
  if (needsReview && (status === "active" || status === "on_hold")) {
    return {
      label: "Menunggu review kamu",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      borderClass: "border-l-amber-400",
    };
  }
  switch (status) {
    case "completed":
      return {
        label: "Selesai",
        badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
        borderClass: "border-l-emerald-400",
      };
    case "on_hold":
      return {
        label: "Ditunda",
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        borderClass: "border-l-amber-400",
      };
    case "cancelled":
      return {
        label: "Dibatalkan",
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
        borderClass: "border-l-slate-300",
      };
    case "draft":
      return {
        label: "Draft",
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
        borderClass: "border-l-slate-300",
      };
    case "active":
    default:
      return {
        label: "Sedang dikerjakan",
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        borderClass: "border-l-blue-400",
      };
  }
}

// Deadline label with days-remaining and overdue detection
function getDeadlineMeta(finishDate: string | null, projectStatus: string) {
  if (!finishDate) return null;
  const due = new Date(finishDate);
  if (isNaN(due.getTime())) return null;

  const dateStr = due.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // Completed/cancelled projects don't need urgency framing
  if (projectStatus === "completed" || projectStatus === "cancelled") {
    return { text: `Target: ${dateStr}`, overdue: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueMid = new Date(due);
  dueMid.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dueMid.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return { text: `Target: ${dateStr} · telat ${Math.abs(diffDays)} hari`, overdue: true };
  }
  if (diffDays === 0) return { text: `Target: ${dateStr} · hari ini`, overdue: false };
  if (diffDays === 1) return { text: `Target: ${dateStr} · besok`, overdue: false };
  return { text: `Target: ${dateStr} · ${diffDays} hari lagi`, overdue: false };
}

// "Update terakhir" from most recent task update or timeline event
function getLastActivity(tasks: Task[], timeline: TimelineEvent[]) {
  const dates: number[] = [];
  for (const t of tasks) {
    const d = new Date(t.updatedAt).getTime();
    if (!isNaN(d)) dates.push(d);
  }
  for (const e of timeline) {
    const d = new Date(e.createdAt).getTime();
    if (!isNaN(d)) dates.push(d);
  }
  if (dates.length === 0) return null;
  const latest = Math.max(...dates);
  const diffDays = Math.floor((Date.now() - latest) / 86_400_000);
  if (diffDays <= 0) return "Update hari ini";
  if (diffDays === 1) return "Update kemarin";
  if (diffDays < 7) return `Update ${diffDays} hari lalu`;
  if (diffDays < 30) return `Update ${Math.floor(diffDays / 7)} minggu lalu`;
  return `Update ${new Date(latest).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`;
}

function ProjectExpandedContent({
  project,
  tasks,
  files,
  timeline,
  hoursSummary,
  entries,
  invoices,
  selectedPkg,
  packages,
  customReqs,
  orders,
  actionLabels,
  token,
  workspaceId,
  ownerWhatsAppPhone,
  ownerEmail,
  ownerName,
}: {
  project: Project;
  tasks: Task[];
  files: FileItem[];
  timeline: TimelineEvent[];
  hoursSummary: HoursSummary | undefined;
  entries: TimeEntry[] | undefined;
  invoices: Invoice[] | undefined;
  selectedPkg: SelectedPackage | undefined;
  packages: PackageItem[];
  customReqs: CustomRequest[];
  orders: PackageOrder[];
  actionLabels: Record<string, string>;
  token: string;
  workspaceId: string;
  ownerWhatsAppPhone?: string | null;
  ownerEmail?: string | null;
  ownerName?: string | null;
}) {
  const isByHours = project.billingType === "hours";
  const isByPackage = project.billingType === "package";

  return (
    <CardContent className="border-t pt-4 pb-4 space-y-4">
      {/* Project details */}
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}
      {(project.startDate || project.finishDate) && (
        <p className="text-xs text-muted-foreground">
          {project.startDate &&
            `Start: ${new Date(project.startDate).toLocaleDateString()}`}
          {project.startDate && project.finishDate && " · "}
          {project.finishDate &&
            `Finish: ${new Date(project.finishDate).toLocaleDateString()}`}
        </p>
      )}
      {isByHours && project.rate && (
        <p className="text-xs text-muted-foreground">
          Rate:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: project.currency || "IDR",
          }).format(Number(project.rate))}
          /hr
        </p>
      )}
      {isByPackage && selectedPkg && (
        <div>
          <p className="text-sm font-semibold">
            {selectedPkg.name}
            {selectedPkg.hours && ` — ${selectedPkg.hours} HOURS`}
          </p>
          <p className="text-xs text-muted-foreground">
            Rate:{" "}
            {formatCurrency(selectedPkg.price, selectedPkg.currency || project.currency || "IDR")}
            /month
          </p>
        </div>
      )}
      {!isByHours && !isByPackage && project.budget && (
        <p className="text-xs text-muted-foreground">
          Budget:{" "}
          {formatCurrency(project.budget, project.currency || "IDR")}
        </p>
      )}

      {/* Hours Summary (by_hours / by_package) */}
      {(isByHours || (isByPackage && project.selectedPackageId)) && hoursSummary && (() => {
        const packageTotalMinutes = selectedPkg?.hours ? selectedPkg.hours * 60 : null;
        const usedMinutes = hoursSummary.totalMinutes;
        const remainingMinutes = packageTotalMinutes != null ? Math.max(0, packageTotalMinutes - usedMinutes) : null;
        const usagePercent = packageTotalMinutes != null && packageTotalMinutes > 0 ? Math.round((usedMinutes / packageTotalMinutes) * 100) : null;

        return (
          <div className="rounded-lg border bg-muted/30 p-4">
            <h4 className="text-sm font-semibold mb-3">
              {isByPackage ? "Package Hours" : "Hours Summary"}
            </h4>
            <div className={`grid gap-4 text-center ${isByPackage && selectedPkg ? "grid-cols-4" : "grid-cols-3"}`}>
              {isByPackage && selectedPkg ? (
                <>
                  <div>
                    <p className="text-xl font-bold">{formatMinutes(packageTotalMinutes!)}</p>
                    <p className="text-xs text-muted-foreground">Package Total</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-600">{formatMinutes(usedMinutes)}</p>
                    <p className="text-xs text-muted-foreground">Used</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{formatMinutes(remainingMinutes!)}</p>
                    <p className="text-xs text-muted-foreground">Remaining</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{hoursSummary.entryCount}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xl font-bold">{formatMinutes(hoursSummary.totalMinutes)}</p>
                    <p className="text-xs text-muted-foreground">Total Tracked</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{formatMinutes(hoursSummary.billableMinutes)}</p>
                    <p className="text-xs text-muted-foreground">Billable</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold">{hoursSummary.entryCount}</p>
                    <p className="text-xs text-muted-foreground">Entries</p>
                  </div>
                </>
              )}
            </div>
            {usagePercent != null && (
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{usagePercent}% used</span>
                  <span>{formatMinutes(remainingMinutes!)} left</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(usagePercent, 100)}%` }}
                  />
                </div>
              </div>
            )}
            {hoursSummary.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {hoursSummary.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Recent Time Entries */}
      {(isByHours || (isByPackage && project.selectedPackageId)) && entries && entries.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Recent Time Entries</h4>
          <div className="rounded-lg border divide-y">
            {entries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{entry.description || "Untitled"}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.startTime ? new Date(entry.startTime).toLocaleDateString() : "—"}
                    {entry.userName && ` · ${entry.userName}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm font-medium">{formatMinutes(entry.durationMinutes)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Package: no package assigned yet */}
      {isByPackage && !project.selectedPackageId && (
        <div className="rounded-lg border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Package not assigned yet. Your admin will assign a package to this project.
          </p>
        </div>
      )}

      {/* By Package: available packages — only when no assigned package */}
      {isByPackage && !project.selectedPackageId && packages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Available Packages</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              let features: string[] = [];
              try { features = pkg.features ? JSON.parse(pkg.features) : []; } catch { /* ignore */ }
              const isHighlighted = !!pkg.badge;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-lg border p-5 text-center space-y-3 ${isHighlighted ? "border-primary bg-primary/5 shadow-md" : "bg-card"}`}
                >
                  {pkg.badge && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">{pkg.badge}</Badge>
                  )}
                  <p className="text-lg font-bold">{pkg.name}</p>
                  {pkg.description && <p className="text-xs text-muted-foreground">{pkg.description}</p>}
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(pkg.price, pkg.currency || "IDR")}
                  </p>
                  {features.length > 0 && (
                    <ul className="text-xs text-left space-y-1.5 pt-2">
                      {features.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <PackageOrderButton
                    token={token}
                    projectId={project.id}
                    packageId={pkg.id}
                    packageName={pkg.name}
                    hours={pkg.hours}
                    price={pkg.customPrice ?? pkg.price}
                    currency={pkg.currency}
                    isHighlighted={isHighlighted}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Orders */}
      {isByPackage && !project.selectedPackageId && orders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">Your Orders</h4>
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                <div>
                  <span className="font-medium">{order.packageName}</span>
                  {order.hours && <span className="text-muted-foreground ml-1">({order.hours}h)</span>}
                  <span className="text-muted-foreground ml-2">
                    — {formatCurrency(order.price, order.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === "confirmed" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">Confirmed</Badge>
                  ) : order.status === "invoiced" ? (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">Invoiced</Badge>
                  ) : order.status === "cancelled" ? (
                    <Badge className="bg-red-100 text-red-700 text-[10px]">Cancelled</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Pending</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Custom Package Request */}
      {isByPackage && !project.selectedPackageId && packages.length > 0 && packages.some((p) => p.allowCustom) && (
        <CustomPackageRequestForm
          projectId={project.id}
          token={token}
          packages={packages.map((p) => ({
            id: p.id,
            name: p.name,
            hours: p.hours,
            price: p.price,
            customPrice: p.customPrice,
            minHours: p.minHours,
            maxHours: p.maxHours,
            currency: p.currency,
          }))}
          existingRequests={customReqs.filter((r) => r.projectId === project.id)}
          currency={project.currency ?? "IDR"}
        />
      )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <CheckCircle2 className="h-4 w-4" /> Tasks
          </h4>
          <PortalTaskList
            token={token}
            tasks={tasks.map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate ? String(t.dueDate) : null,
              updatedAt: String(t.updatedAt),
            }))}
          />
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4" /> Files
          </h4>
          <PortalFileList
            files={files.map((f) => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              sizeBytes: f.sizeBytes ?? null,
              fileType: f.fileType,
              createdAt: String(f.createdAt),
            }))}
            token={token}
          />
        </div>
      )}

      {/* Timeline (last 3) */}
      {timeline.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Activity className="h-4 w-4" /> Timeline
          </h4>
          <div className="rounded-lg border divide-y">
            {timeline.slice(0, 3).map((event) => (
              <div key={event.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  <span className="truncate">
                    {actionLabels[event.action] ?? event.action.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {event.entityType.replace(/_/g, " ")}
                  </Badge>
                  <span>{new Date(event.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Contact team — WA / email only */}
      <Separator />
      <div>
        <h4 className="mb-2 text-sm font-semibold">Hubungi tim</h4>
        <PortalContactButtons
          phone={ownerWhatsAppPhone}
          email={ownerEmail}
          ownerName={ownerName}
          projectName={project.name}
          compact
        />
      </div>
    </CardContent>
  );
}

function ProjectSummary({
  project,
  tasks,
  timeline,
  selectedPkg,
  hoursSummary,
}: {
  project: Project;
  tasks: Task[];
  timeline: TimelineEvent[];
  selectedPkg: SelectedPackage | undefined;
  hoursSummary: HoursSummary | undefined;
}) {
  const isByHours = project.billingType === "hours";
  const isByPackage = project.billingType === "package";

  const { total, done, pct } = taskProgress(tasks);
  const deadline = getDeadlineMeta(project.finishDate, project.status);
  const lastActivity = getLastActivity(tasks, timeline);

  // Primary progress line: task completion is what clients care about.
  // Falls back to billing-specific progress when a project has no visible tasks.
  const progressLine = (() => {
    if (total > 0) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-foreground">
            {done}/{total} task selesai
          </span>
          <div className="h-1.5 w-24 rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-emerald-500" : "bg-blue-500"}`}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
      );
    }

    if (isByPackage && selectedPkg && hoursSummary) {
      const totalMins = selectedPkg.hours ? selectedPkg.hours * 60 : 0;
      const usedMins = hoursSummary.totalMinutes;
      const upct = totalMins > 0 ? Math.round((usedMins / totalMins) * 100) : 0;
      return (
        <div className="flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatMinutes(usedMins)} / {formatMinutes(totalMins)}
          </span>
          <div className="h-1.5 w-20 rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${upct > 90 ? "bg-red-500" : upct > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(upct, 100)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{formatMinutes(Math.max(0, totalMins - usedMins))} sisa</span>
        </div>
      );
    }

    if (isByHours && hoursSummary) {
      return (
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">
            {formatMinutes(hoursSummary.totalMinutes)} tercatat
          </span>
        </div>
      );
    }

    return <span className="text-xs text-muted-foreground">Belum ada task</span>;
  })();

  return (
    <div className="space-y-1">
      {progressLine}
      {(deadline || lastActivity) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
          {deadline && (
            <span className={deadline.overdue ? "font-medium text-red-600" : undefined}>
              {deadline.text}
            </span>
          )}
          {deadline && lastActivity && <span className="text-muted-foreground/50">·</span>}
          {lastActivity && <span>{lastActivity}</span>}
        </div>
      )}
    </div>
  );
}

export function ProjectAccordion({
  projects,
  projectTasksMap,
  projectFilesMap,
  projectTimelineMap,
  projectHoursMap,
  byHoursEntriesMap,
  projectInvoicesMap,
  selectedPackageMap,
  projectPackagesMap,
  customRequests,
  packageOrdersList,
  clientVisibleActionLabels,
  token,
  workspaceId,
  ownerWhatsAppPhone,
  ownerEmail,
  ownerName,
}: ProjectAccordionProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const toggleProject = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Split into active (in-progress) vs archived (completed/cancelled) so the
  // client always sees live work first and finished work stays out of the way.
  const isArchived = (status: string) => status === "completed" || status === "cancelled";
  const activeProjects = projects.filter((p) => !isArchived(p.status));
  const archivedProjects = projects.filter((p) => isArchived(p.status));

  const renderCard = (project: Project) => {
    const isExpanded = expandedId === project.id;
    const tasks = projectTasksMap.get(project.id) || [];
    const files = projectFilesMap.get(project.id) || [];
    const timeline = projectTimelineMap.get(project.id) || [];
    const hoursSummary = projectHoursMap.get(project.id);
    const entries = byHoursEntriesMap.get(project.id);
    const invoices = projectInvoicesMap.get(project.id) || [];
    const selectedPkg = project.selectedPackageId ? selectedPackageMap.get(project.selectedPackageId) : undefined;
    const packages = projectPackagesMap.get(project.id) || [];
    const orders = packageOrdersList.filter((o) => o.projectId === project.id);

    const needsReview = hasReviewTask(tasks);
    const statusMeta = getProjectStatusMeta(project.status, needsReview);

    return (
      <Card key={project.id} className={`overflow-hidden border-l-4 ${statusMeta.borderClass}`}>
        {/* Collapsed header — always visible */}
        <div
          className="flex items-start justify-between gap-3 p-5 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => toggleProject(project.id)}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="h-5 w-5 text-foreground shrink-0 mt-0.5" />
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-semibold text-base truncate">{project.name}</span>
                <Badge variant="secondary" className="text-[11px] shrink-0">
                  {project.billingType === "hours"
                    ? "By Hours"
                    : project.billingType === "package"
                      ? "By Package"
                      : "By Project"}
                </Badge>
              </div>
              <div className="mt-1.5">
                <ProjectSummary
                  project={project}
                  tasks={tasks}
                  timeline={timeline}
                  selectedPkg={selectedPkg}
                  hoursSummary={hoursSummary}
                />
              </div>
            </div>
          </div>
          <Badge variant="outline" className={`text-[11px] shrink-0 ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </Badge>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <ProjectExpandedContent
            project={project}
            tasks={tasks}
            files={files}
            timeline={timeline}
            hoursSummary={hoursSummary}
            entries={entries}
            invoices={invoices}
            selectedPkg={selectedPkg}
            packages={packages}
            customReqs={customRequests}
            orders={orders}
            actionLabels={clientVisibleActionLabels}
            token={token}
            workspaceId={workspaceId}
            ownerWhatsAppPhone={ownerWhatsAppPhone}
            ownerEmail={ownerEmail}
            ownerName={ownerName}
          />
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {activeProjects.map(renderCard)}

      {activeProjects.length === 0 && archivedProjects.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">Belum ada project yang dibagikan.</p>
        </div>
      )}

      {archivedProjects.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            {showArchived ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">
              Project selesai ({archivedProjects.length})
            </span>
          </button>
          {showArchived && (
            <div className="mt-3 space-y-3">
              {archivedProjects.map(renderCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
