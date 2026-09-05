"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  Clock,
  Package,
  FolderKanban,
} from "lucide-react";
import { PortalTaskList } from "./portal-task-list";
import { PortalFileList } from "./portal-file-list";
import { CustomPackageRequestForm } from "./custom-package-request-form";
import { PackageOrderButton } from "./package-order-button";
import { PortalContactButtons } from "./portal-contact";
import { useT } from "@/lib/i18n-client";
import { portalLocale, portalStatusLabel } from "@/lib/portal-i18n";
import { getProjectProgress } from "@/lib/project-progress";
import { resolveBillingModel } from "@/lib/billing-model";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  billingModel?: string | null;
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
}

interface TaskTimeEntry {
  id: string;
  description: string | null;
  durationMinutes: number;
  startTime: string | null;
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
  projectPackageAssignmentId?: string | null;
  includedServices?: Array<{ serviceName: string; includedAllowance: string | null }>;
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
  taskHoursMap?: Map<string, number>;
  /** Time entries grouped by taskId — shown under each task (no project-level recent list). */
  taskEntriesMap?: Map<string, TaskTimeEntry[]>;
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

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Client-facing money: invoice/package currency as-is (no workspace base). */
function formatCurrency(amount: string | number, currency: string) {
  const code = (currency || "IDR").toUpperCase();
  if (code === "IDR") {
    return `Rp${Number(amount).toLocaleString("id-ID", { maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
    minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
  }).format(Number(amount));
}

function projectBillingLabel(project: Project, t: ReturnType<typeof useT>["t"]) {
  const model = resolveBillingModel({
    billingModel: project.billingModel,
    billingType: project.billingType,
  });

  if (model === "hourly") return t("Per jam", "Hourly");
  if (model === "retainer") return t("Retainer", "Retainer");
  if (model === "legacy_package") return t("Per paket", "Package");
  return t("Harga tetap", "Fixed price");
}

// ── Portal UX helpers (client-facing, Bahasa Indonesia) ──

// Task progress: how many tasks are done out of total
function taskProgress(tasks: Task[]) {
  // Equal weight per task; cancelled ignored
  const active = tasks.filter((t) => t.status !== "cancelled");
  const total = active.length;
  const done = active.filter((t) => t.status === "done").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function progressPie(pct: number, size = 44) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(Math.max(pct, 0), 100) / 100);
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className="shrink-0">
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth="5"
      />
      <circle
        cx="20"
        cy="20"
        r={r}
        fill="none"
        stroke={pct >= 100 ? "#10b981" : "#2563eb"}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 20 20)"
      />
      <text
        x="20"
        y="21"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-slate-700"
        style={{ fontSize: 9, fontWeight: 600 }}
      >
        {pct}%
      </text>
    </svg>
  );
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
function getProjectStatusMeta(
  status: string,
  needsReview: boolean,
  allTasksDone = false,
  lang: "id" | "en" = "id",
): StatusMeta {
  if (allTasksDone && status === "active" && !needsReview)
    return {
      label: lang === "en" ? "Awaiting closure" : "Menunggu penutupan",
      badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
      borderClass: "border-l-emerald-400",
    };
  if (needsReview && (status === "active" || status === "on_hold")) {
    return {
      label: lang === "en" ? "Awaiting your review" : "Menunggu review kamu",
      badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
      borderClass: "border-l-amber-400",
    };
  }
  switch (status) {
    case "completed":
      return {
        label: portalStatusLabel("completed", lang),
        badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
        borderClass: "border-l-emerald-400",
      };
    case "on_hold":
      return {
        label: portalStatusLabel("on_hold", lang),
        badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
        borderClass: "border-l-amber-400",
      };
    case "cancelled":
      return {
        label: portalStatusLabel("cancelled", lang),
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
        borderClass: "border-l-slate-300",
      };
    case "draft":
      return {
        label: portalStatusLabel("draft", lang),
        badgeClass: "bg-slate-100 text-slate-500 border-slate-200",
        borderClass: "border-l-slate-300",
      };
    case "active":
    default:
      return {
        label: portalStatusLabel("active", lang),
        badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
        borderClass: "border-l-blue-400",
      };
  }
}

// "Update terakhir" from most recent task update or timeline event
function getLastActivity(
  tasks: Task[],
  timeline: TimelineEvent[],
  lang: "id" | "en",
) {
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
  if (diffDays <= 0) return lang === "en" ? "Updated today" : "Update hari ini";
  if (diffDays === 1)
    return lang === "en" ? "Updated yesterday" : "Update kemarin";
  if (diffDays < 7)
    return lang === "en"
      ? `Updated ${diffDays} days ago`
      : `Update ${diffDays} hari lalu`;
  if (diffDays < 30)
    return lang === "en"
      ? `Updated ${Math.floor(diffDays / 7)} weeks ago`
      : `Update ${Math.floor(diffDays / 7)} minggu lalu`;
  return `${lang === "en" ? "Updated" : "Update"} ${new Date(latest).toLocaleDateString(portalLocale(lang), { day: "numeric", month: "short" })}`;
}

function ProjectExpandedContent({
  project,
  tasks,
  files,
  timeline: _timeline,
  hoursSummary,
  taskHoursMap,
  taskEntriesMap,
  invoices: _invoices,
  selectedPkg,
  packages,
  customReqs,
  orders,
  actionLabels: _actionLabels,
  token,
  workspaceId: _workspaceId,
  ownerWhatsAppPhone,
  ownerEmail,
  ownerName,
}: {
  project: Project;
  tasks: Task[];
  files: FileItem[];
  timeline: TimelineEvent[];
  hoursSummary: HoursSummary | undefined;
  taskHoursMap?: Map<string, number>;
  taskEntriesMap?: Map<string, TaskTimeEntry[]>;
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
  const { t } = useT();
  const isByHours = project.billingType === "hours";
  const isByPackage = project.billingType === "package";
  const assignedPackage = selectedPkg
    ? packages.find((pkg) => pkg.id === selectedPkg.id) ?? null
    : null;
  const includedServices = assignedPackage?.includedServices ?? [];
  const remainingHours = selectedPkg?.hours != null && hoursSummary
    ? Math.max(0, selectedPkg.hours - hoursSummary.totalMinutes / 60)
    : null;

  return (
    <CardContent className="border-t pt-4 pb-4 space-y-4">
      {/* Project details */}
      {project.description && (
        <p className="text-sm text-muted-foreground">{project.description}</p>
      )}
      {(project.startDate || project.finishDate) && (
        <p className="text-xs text-muted-foreground">
          {project.startDate &&
            `Mulai: ${new Date(project.startDate).toLocaleDateString("id-ID")}`}
          {project.startDate && project.finishDate && " · "}
          {project.finishDate &&
            `Selesai: ${new Date(project.finishDate).toLocaleDateString("id-ID")}`}
        </p>
      )}
      {isByHours && project.rate && (
        <p className="text-xs text-muted-foreground">
          Tarif:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: project.currency || "IDR",
          }).format(Number(project.rate))}
          /jam
        </p>
      )}
      {isByPackage && selectedPkg && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          <div>
            <p className="text-sm font-semibold">
              {selectedPkg.name}
              {selectedPkg.hours && ` — ${selectedPkg.hours} JAM`}
            </p>
            <p className="text-xs text-muted-foreground">
              Tarif:{" "}
              {formatCurrency(
                selectedPkg.price,
                selectedPkg.currency || project.currency || "IDR",
              )}
              /bulan
              {remainingHours != null && ` · ${remainingHours.toFixed(1)} jam tersisa`}
            </p>
          </div>
          {includedServices.length > 0 ? (
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground">{t("Layanan termasuk", "Included services")}</p>
              <p>{includedServices.map((service) => service.serviceName).join(", ")}</p>
            </div>
          ) : assignedPackage?.projectPackageAssignmentId ? (
            <p className="text-xs text-muted-foreground">{t("Paket diarsipkan, riwayat order tetap aman.", "Package archived; order history remains safe.")}</p>
          ) : null}
        </div>
      )}
      {!isByHours && !isByPackage && project.budget && (
        <p className="text-xs text-muted-foreground">
          Anggaran: {formatCurrency(project.budget, project.currency || "IDR")}
        </p>
      )}

      {/* Hours Summary (by_hours / by_package) */}
      {(isByHours || (isByPackage && project.selectedPackageId)) &&
        hoursSummary &&
        (() => {
          const packageTotalMinutes = selectedPkg?.hours
            ? selectedPkg.hours * 60
            : null;
          const usedMinutes = hoursSummary.totalMinutes;
          const remainingMinutes =
            packageTotalMinutes != null
              ? Math.max(0, packageTotalMinutes - usedMinutes)
              : null;
          const usagePercent =
            packageTotalMinutes != null && packageTotalMinutes > 0
              ? Math.round((usedMinutes / packageTotalMinutes) * 100)
              : null;

          return (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-semibold mb-3">
                {isByPackage
                  ? t("Jam paket", "Package hours")
                  : t("Ringkasan jam", "Hours summary")}
              </h4>
              <div
                className={`grid gap-4 text-center ${isByPackage && selectedPkg ? "grid-cols-4" : "grid-cols-3"}`}
              >
                {isByPackage && selectedPkg ? (
                  <>
                    <div>
                      <p className="text-xl font-bold">
                        {formatMinutes(packageTotalMinutes!)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total paket
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-amber-600">
                        {formatMinutes(usedMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Terpakai", "Used")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatMinutes(remainingMinutes!)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Sisa", "Remaining")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {hoursSummary.entryCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Entri", "Entries")}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <p className="text-xl font-bold">
                        {formatMinutes(hoursSummary.totalMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total tercatat
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatMinutes(hoursSummary.billableMinutes)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dapat ditagih
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-bold">
                        {hoursSummary.entryCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Entri", "Entries")}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {usagePercent != null && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{usagePercent}% terpakai</span>
                    <span>{formatMinutes(remainingMinutes!)} tersisa</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full transition-all ${usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* By Package: no package assigned yet */}
      {isByPackage && !project.selectedPackageId && (
        <div className="rounded-lg border bg-muted/30 p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Paket belum ditentukan. Tim akan menentukan paket untuk proyek ini.
          </p>
        </div>
      )}

      {/* By Package: available packages — only when no assigned package */}
      {isByPackage && !project.selectedPackageId && packages.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">
            {t("Paket tersedia", "Available packages")}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {packages.map((pkg) => {
              let features: string[] = [];
              try {
                features = pkg.features ? JSON.parse(pkg.features) : [];
              } catch {
                /* ignore */
              }
              const isHighlighted = !!pkg.badge;
              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-lg border p-5 text-center space-y-3 ${isHighlighted ? "border-primary bg-primary/5 shadow-md" : "bg-card"}`}
                >
                  {pkg.badge && (
                    <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px]">
                      {pkg.badge}
                    </Badge>
                  )}
                  <p className="text-lg font-bold">{pkg.name}</p>
                  {pkg.description && (
                    <p className="text-xs text-muted-foreground">
                      {pkg.description}
                    </p>
                  )}
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
                  {pkg.includedServices && pkg.includedServices.length > 0 && (
                    <div className="rounded-md bg-muted/40 p-2 text-left text-xs text-muted-foreground">
                      <p className="font-medium text-foreground">{t("Layanan termasuk", "Included services")}</p>
                      <p>{pkg.includedServices.map((service) => service.serviceName).join(", ")}</p>
                    </div>
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

      {/* Order history */}
      {isByPackage && !project.selectedPackageId && orders.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-2">
            {t("Riwayat order", "Order history")}
          </h4>
          <div className="space-y-2">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <span className="font-medium">{order.packageName}</span>
                  {order.hours && (
                    <span className="text-muted-foreground ml-1">
                      ({order.hours} jam)
                    </span>
                  )}
                  <span className="text-muted-foreground ml-2">
                    — {formatCurrency(order.price, order.currency)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {order.status === "confirmed" ? (
                    <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                      Dikonfirmasi
                    </Badge>
                  ) : order.status === "invoiced" ? (
                    <Badge className="bg-blue-100 text-blue-700 text-[10px]">
                      Ditagihkan
                    </Badge>
                  ) : order.status === "cancelled" ? (
                    <Badge className="bg-red-100 text-red-700 text-[10px]">
                      Dibatalkan
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                      Menunggu
                    </Badge>
                  )}
                  {!order.packageName && <span className="text-xs text-muted-foreground">{t("Paket diarsipkan", "Package archived")}</span>}
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
      {isByPackage &&
        !project.selectedPackageId &&
        packages.length > 0 &&
        packages.some((p) => p.allowCustom) && (
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
            existingRequests={customReqs.filter(
              (r) => r.projectId === project.id,
            )}
            currency={project.currency ?? "IDR"}
          />
        )}

      {/* Tasks */}
      {tasks.length > 0 && (
        <details
          className="group rounded-lg border bg-background"
          open={tasks.length <= 3}
        >
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> {t("Tugas", "Tasks")} (
              {tasks.length})
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t p-3">
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
                hoursMinutes: taskHoursMap?.get(t.id) ?? 0,
                timeEntries: taskEntriesMap?.get(t.id) ?? [],
              }))}
            />
          </div>
        </details>
      )}

      {/* Files */}
      {files.length > 0 && (
        <details className="group rounded-lg border bg-background">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <FileText className="h-4 w-4" /> File ({files.length})
            </span>
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t p-3">
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
        </details>
      )}

      {/* Contact team — WA / email only */}
      <Separator />
      <div>
        <h4 className="mb-2 text-sm font-semibold">
          {t("Hubungi tim", "Contact team")}
        </h4>
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
}: {
  project: Project;
  tasks: Task[];
  timeline: TimelineEvent[];
}) {
  const { lang, t } = useT();
  const isTaskProgress = project.billingType === "project";
  const { total, done, pct } = taskProgress(tasks);
  const lastActivity = getLastActivity(tasks, timeline, lang);
  const formatDate = (value: string) => new Date(value).toLocaleDateString(portalLocale(lang), {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <div className="space-y-1.5">
      {isTaskProgress && total > 0 ? (
        <div className="flex items-center gap-2">
          {progressPie(pct)}
          <span className="text-xs font-medium text-foreground">{done}/{total} tugas selesai</span>
        </div>
      ) : total > 0 ? (
        <p className="text-[11px] text-muted-foreground">{done}/{total} tugas selesai</p>
      ) : (
        <span className="text-xs text-muted-foreground">{t("Belum ada tugas", "No tasks yet")}</span>
      )}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
        {project.startDate && <span>{t("Mulai", "Start")}: {formatDate(project.startDate)}</span>}
        {project.startDate && project.finishDate && <span className="text-muted-foreground/50">·</span>}
        {project.finishDate && <span>{t("Target selesai", "Target finish")}: {formatDate(project.finishDate)}</span>}
        {(project.startDate || project.finishDate) && lastActivity && <span className="text-muted-foreground/50">·</span>}
        {lastActivity && <span>{lastActivity}</span>}
      </div>
    </div>
  );
}

export function ProjectAccordion({
  projects,
  projectTasksMap,
  projectFilesMap,
  projectTimelineMap,
  projectHoursMap,
  taskHoursMap,
  taskEntriesMap,
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
  const { lang, t } = useT();
  // Multi-expand: client can open several projects at once.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [showArchived, setShowArchived] = useState(false);

  const toggleProject = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Split into active (in-progress) vs archived (completed/cancelled) so the
  // client always sees live work first and finished work stays out of the way.
  const isArchived = (status: string) =>
    status === "completed" || status === "cancelled" || status === "archived";
  const activeProjects = projects.filter((p) => !isArchived(p.status));
  const archivedProjects = projects.filter((p) => isArchived(p.status));

  const renderCard = (project: Project) => {
    const isExpanded = expandedIds.has(project.id);
    const tasks = projectTasksMap.get(project.id) || [];
    const files = projectFilesMap.get(project.id) || [];
    const timeline = projectTimelineMap.get(project.id) || [];
    const hoursSummary = projectHoursMap.get(project.id);
    const invoices = projectInvoicesMap.get(project.id) || [];
    const selectedPkg = project.selectedPackageId
      ? selectedPackageMap.get(project.selectedPackageId)
      : undefined;
    const packages = projectPackagesMap.get(project.id) || [];
    const orders = packageOrdersList.filter((o) => o.projectId === project.id);

    const needsReview = hasReviewTask(tasks);
    const progress = taskProgress(tasks);
    const billingProgress = getProjectProgress({
      billingType: project.billingType,
      totalTasks: progress.total,
      doneTasks: progress.done,
      trackedMinutes: hoursSummary?.totalMinutes ?? 0,
      packageHours: selectedPkg?.hours ?? null,
    });
    const billingHoursLabel =
      project.billingType === "hours"
        ? `${billingProgress.label} ${t("tercatat", "tracked")}`
        : project.billingType === "package"
          ? billingProgress.label
          : null;
    const packageQuotaExhausted =
      project.billingType === "package" &&
      project.status === "active" &&
      !!selectedPkg?.hours &&
      (hoursSummary?.totalMinutes ?? 0) >= selectedPkg.hours * 60;
    const statusMeta = packageQuotaExhausted
      ? {
          label: t("Kuota habis", "Quota exhausted"),
          badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
          borderClass: "border-l-amber-400",
        }
      : getProjectStatusMeta(
          project.status,
          needsReview,
          project.billingType === "project" && progress.total > 0 && progress.pct === 100,
          lang,
        );

    return (
      <Card
        key={project.id}
        className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
          isExpanded ? "border-primary/40 shadow-sm" : "border-border/80 hover:border-primary/30 shadow-xs"
        }`}
      >
        {/* Collapsed header — ultra-compact, crisp, modern linear style */}
        <div
          className="flex cursor-pointer flex-col gap-2.5 p-3.5 sm:p-4 transition-colors hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
          onClick={() => toggleProject(project.id)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <FolderKanban className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-sm font-bold text-foreground">
                  {project.name}
                </span>
                <Badge variant="secondary" className="shrink-0 text-[10px] font-semibold h-5 px-2 rounded-full border border-border/80 bg-muted/60 text-muted-foreground">
                  {projectBillingLabel(project, t)}
                </Badge>
              </div>
              <div className="mt-0.5">
                <ProjectSummary
                  project={project}
                  tasks={tasks}
                  timeline={timeline}
                />
              </div>
            </div>
          </div>
          <div className="ml-8 flex shrink-0 flex-col items-end gap-2 sm:ml-0">
            {billingHoursLabel && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-muted-foreground">
                {project.billingType === "package" ? (
                  <Package className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span>{billingHoursLabel}</span>
              </div>
            )}
            <Badge
              variant="outline"
              className={`text-[10px] font-bold h-5 px-2 rounded-full border ${statusMeta.badgeClass}`}
            >
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-current" />
              {statusMeta.label}
            </Badge>
          </div>
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="portal-expand-in">
            <ProjectExpandedContent
              project={project}
              tasks={tasks}
              files={files}
              timeline={timeline}
              hoursSummary={hoursSummary}
              taskHoursMap={taskHoursMap}
              taskEntriesMap={taskEntriesMap}
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
          </div>
        )}
      </Card>
    );
  };

  return (
    <div className="space-y-3">
      {activeProjects.map(renderCard)}

      {activeProjects.length === 0 && archivedProjects.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t(
              "Belum ada proyek yang dibagikan.",
              "No projects have been shared yet.",
            )}
          </p>
        </div>
      )}

      {archivedProjects.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-dashed p-3 text-sm text-muted-foreground transition-colors hover:bg-muted/30"
          >
            {showArchived ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span className="font-medium">
              {t("Proyek selesai", "Completed projects")} (
              {archivedProjects.length})
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
