import { getWorkspaceFullForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  clients,
  invoices,
  payments,
  projects,
  workspaceCurrencyRates,
  workspaceMembers,
} from "@/db/schema";
import { eq, desc, and, count, ne, isNull, SQL, sql, inArray } from "drizzle-orm";
import { requireUser } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, FileText, ChevronLeft, ChevronRight, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { EmptyState } from "@/components/empty-state";
import { InvoicesListTable } from "@/components/invoices/invoices-list-table";
import { getCurrentLang, createT } from "@/lib/i18n";
import { billingTypeLabel } from "@/lib/feature-access";
import { StatusFilterTabs } from "@/components/ui/status-filter-tabs";
import {
  buildRateMap,
  convertToBase,
  normalizeCurrency,
} from "@/lib/currency-base";

const PAGE_SIZE = 10;

const STATUS_TABS = [
  "all",
  "draft",
  "sent",
  "viewed",
  "overdue",
  "paid",
  "cancelled",
  "archived",
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

const BILLING_FILTERS = ["all", "hours", "package", "project", "none"] as const;
type BillingFilter = (typeof BILLING_FILTERS)[number];

function parseStatusTab(raw?: string): StatusTab {
  if (raw && (STATUS_TABS as readonly string[]).includes(raw)) {
    return raw as StatusTab;
  }
  return "all";
}

function parseBillingFilter(raw?: string): BillingFilter {
  if (raw && (BILLING_FILTERS as readonly string[]).includes(raw)) {
    return raw as BillingFilter;
  }
  return "all";
}

function parsePage(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function isUuid(value?: string): value is string {
  return Boolean(
    value &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      ),
  );
}

function tabLabel(tab: StatusTab, lang: "id" | "en"): string {
  if (tab === "all") return lang === "en" ? "All" : "Semua";
  return invoiceStatusVariant(tab, lang).label;
}

function billingFilterLabel(filter: BillingFilter, lang: "id" | "en"): string {
  if (filter === "all") return lang === "en" ? "All billing types" : "Semua jenis";
  if (filter === "none") return lang === "en" ? "No project" : "Tanpa proyek";
  return billingTypeLabel(filter, lang);
}

type InvoiceListFilters = {
  status: StatusTab;
  clientId?: string;
  projectId?: string;
  billing: BillingFilter;
  page: number;
};

function buildInvoicesHref(filters: InvoiceListFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.clientId) params.set("clientId", filters.clientId);
  if (filters.projectId) params.set("projectId", filters.projectId);
  if (filters.billing !== "all") params.set("billing", filters.billing);
  if (filters.page > 1) params.set("page", String(filters.page));
  const qs = params.toString();
  return qs ? `/app/invoices?${qs}` : "/app/invoices";
}

function buildFilterConditions(opts: {
  workspaceId: string;
  statusTab: StatusTab;
  clientId?: string;
  projectId?: string;
  billing: BillingFilter;
}): SQL[] {
  const conditions: SQL[] = [eq(invoices.workspaceId, opts.workspaceId)];

  if (opts.statusTab === "all") {
    conditions.push(ne(invoices.status, "archived"));
  } else {
    conditions.push(eq(invoices.status, opts.statusTab));
  }

  if (opts.clientId) {
    conditions.push(eq(invoices.clientId, opts.clientId));
  }

  if (opts.projectId) {
    conditions.push(eq(invoices.projectId, opts.projectId));
  }

  if (opts.billing === "none") {
    conditions.push(isNull(invoices.projectId));
  } else if (opts.billing !== "all") {
    conditions.push(eq(projects.billingType, opts.billing));
  }

  return conditions;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    page?: string;
    clientId?: string;
    projectId?: string;
    billing?: string;
  }>;
}) {
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const ws = await getWorkspaceFullForCurrentUser();
  const workspaceId = ws.id;
  const baseCurrency = normalizeCurrency(ws.defaultCurrency || "IDR");
  const params = await searchParams;
  const statusTab = parseStatusTab(params.status);
  const page = parsePage(params.page);
  const billing = parseBillingFilter(params.billing);
  const clientId = isUuid(params.clientId) ? params.clientId : undefined;
  const projectId = isUuid(params.projectId) ? params.projectId : undefined;

  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
    .limit(1);
  const canWrite = member?.role === "owner" || member?.role === "member";

  const rateRows = await db
    .select({
      fromCurrency: workspaceCurrencyRates.fromCurrency,
      rate: workspaceCurrencyRates.rate,
    })
    .from(workspaceCurrencyRates)
    .where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const rateMap = buildRateMap(rateRows);

  // Client options for filter dropdown
  const clientOptions = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(clients.name);

  const projectOptions = await db
    .select({ id: projects.id, name: projects.name })
    .from(projects)
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(projects.name);

  // Counts per status (respect client/billing filters; include archived for badge)
  const statusCountWhere: SQL[] = [eq(invoices.workspaceId, workspaceId)];
  if (clientId) statusCountWhere.push(eq(invoices.clientId, clientId));
  if (projectId) statusCountWhere.push(eq(invoices.projectId, projectId));
  if (billing === "none") statusCountWhere.push(isNull(invoices.projectId));
  else if (billing !== "all") statusCountWhere.push(eq(projects.billingType, billing));

  const needsProjectJoin = billing !== "all" && billing !== "none";

  const statusCountRows = needsProjectJoin
    ? await db
        .select({
          status: invoices.status,
          total: count(),
        })
        .from(invoices)
        .leftJoin(projects, eq(projects.id, invoices.projectId))
        .where(and(...statusCountWhere))
        .groupBy(invoices.status)
    : await db
        .select({
          status: invoices.status,
          total: count(),
        })
        .from(invoices)
        .where(and(...statusCountWhere))
        .groupBy(invoices.status);

  const countsByStatus = Object.fromEntries(
    statusCountRows.map((row) => [row.status, Number(row.total) || 0]),
  ) as Record<string, number>;
  const archivedCount = countsByStatus.archived ?? 0;
  const totalActive = Object.entries(countsByStatus).reduce(
    (sum, [status, n]) => (status === "archived" ? sum : sum + n),
    0,
  );
  const totalAllIncludingArchived = totalActive + archivedCount;
  const tabCount = (tab: StatusTab) =>
    tab === "all" ? totalActive : countsByStatus[tab] ?? 0;

  const filteredTotal = tabCount(statusTab);
  const totalPages = Math.max(1, Math.ceil(filteredTotal / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const listConditions = buildFilterConditions({
    workspaceId,
    statusTab,
    clientId,
    projectId,
    billing,
  });

  const invoiceList = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      clientId: invoices.clientId,
      clientName: clients.name,
      clientCompany: clients.companyName,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      currency: invoices.currency,
      total: invoices.total,
      status: invoices.status,
      createdAt: invoices.createdAt,
      projectId: invoices.projectId,
      projectName: projects.name,
      billingType: projects.billingType,
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(...listConditions))
    .orderBy(desc(invoices.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset);

  const invoiceListWithBase = invoiceList.map((inv) => {
    const totalBase =
      ws.showBaseCurrencyApprox !== false
        ? convertToBase(Number(inv.total) || 0, inv.currency, baseCurrency, rateMap)
        : null;
    return { ...inv, totalBase };
  });

  // KPI summary for current filters (all matching invoices, not just page)
  const kpiInvoiceRows = await db
    .select({
      id: invoices.id,
      total: invoices.total,
      currency: invoices.currency,
      status: invoices.status,
    })
    .from(invoices)
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(...listConditions));

  const kpiIds = kpiInvoiceRows.map((r) => r.id);
  const paidByInvoice = new Map<string, number>();
  if (kpiIds.length > 0) {
    const paidRows = await db
      .select({
        invoiceId: payments.invoiceId,
        paid: sql<string>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(inArray(payments.invoiceId, kpiIds))
      .groupBy(payments.invoiceId);
    for (const row of paidRows) {
      paidByInvoice.set(row.invoiceId, Number(row.paid) || 0);
    }
  }

  const missingFx = new Set<string>();
  let outstandingBase = 0;
  let paidBase = 0;
  let billedBase = 0;
  let outstandingCount = 0;
  let paidCount = 0;

  for (const inv of kpiInvoiceRows) {
    if (inv.status === "cancelled" || inv.status === "draft" || inv.status === "archived") {
      continue;
    }
    const total = Number(inv.total) || 0;
    const paid = Math.min(paidByInvoice.get(inv.id) ?? 0, total);
    const remaining = Math.max(0, total - paid);

    const totalConv = convertToBase(total, inv.currency, baseCurrency, rateMap);
    const paidConv = convertToBase(paid, inv.currency, baseCurrency, rateMap);
    const remConv = convertToBase(remaining, inv.currency, baseCurrency, rateMap);

    if (totalConv === null || paidConv === null || remConv === null) {
      const cur = normalizeCurrency(inv.currency);
      if (cur !== baseCurrency) missingFx.add(cur);
      continue;
    }

    billedBase += totalConv;
    paidBase += paidConv;
    if (remaining > 0.000001) {
      outstandingBase += remConv;
      outstandingCount += 1;
    }
    if (paid > 0.000001) {
      paidCount += 1;
    }
  }

  // Also track missing FX from list page rows for warning completeness
  for (const inv of invoiceListWithBase) {
    if (
      inv.totalBase == null &&
      normalizeCurrency(inv.currency) !== baseCurrency
    ) {
      missingFx.add(normalizeCurrency(inv.currency));
    }
  }
  const missingFxList = Array.from(missingFx).sort();

  const fromItem = filteredTotal === 0 ? 0 : offset + 1;
  const toItem = Math.min(offset + invoiceList.length, filteredTotal);

  const filtersForHref = {
    status: statusTab,
    clientId,
    projectId,
    billing,
    page: currentPage,
  };

  const hasExtraFilters = Boolean(clientId) || Boolean(projectId) || billing !== "all";
  const selectedClient = clientId
    ? clientOptions.find((c) => c.id === clientId)
    : undefined;

  return (
    <div className="min-w-0 space-y-4 sm:space-y-6">
      <div className="app-page-header">
        <div className="min-w-0">
          <h1 className="app-page-title">{t("Invoice", "Invoices")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              `Baris total tetap currency invoice. Ringkasan setara ${baseCurrency}.`,
              `Row totals keep invoice currency. Summaries in ${baseCurrency}.`,
            )}
          </p>
        </div>
        <div className="flex w-full sm:w-auto">
          {canWrite && (
            <Link href="/app/invoices/new" className="min-w-0 flex-1 sm:flex-none">
              <Button size="sm" className="w-full gap-2 sm:w-auto">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("Invoice Baru", "New Invoice")}</span>
                <span className="sm:hidden">{t("Baru", "New")}</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* KPI summary — base currency */}
      {totalAllIncludingArchived > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Belum Dibayar", "Outstanding")}
              </CardTitle>
              <AlertCircle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">
                {formatMoney(outstandingBase, baseCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {outstandingCount}{" "}
                {outstandingCount === 1
                  ? t("invoice sisa", "invoice open")
                  : t("invoice sisa", "invoices open")}
                {` · ${baseCurrency}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Dibayar", "Paid")}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums text-emerald-700">
                {formatMoney(paidBase, baseCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {paidCount}{" "}
                {paidCount === 1
                  ? t("invoice ada bayar", "invoice with payment")
                  : t("invoice ada bayar", "invoices with payment")}
                {` · ${baseCurrency}`}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("Ditagihkan", "Billed")}
              </CardTitle>
              <Wallet className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold tabular-nums">
                {formatMoney(billedBase, baseCurrency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {t("Invoice terkirim, dilihat, terlambat, dan lunas", "Sent, viewed, overdue, and paid invoices")}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {missingFxList.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {t(
            `Kurs belum di-set: ${missingFxList.join(", ")}. Angka currency itu di-skip di ringkasan. `,
            `Missing FX rates: ${missingFxList.join(", ")}. Those currencies are skipped in summaries. `,
          )}
          <Link href="/app/settings?tab=workspace" className="underline underline-offset-2 font-medium">
            {t("Atur di Settings", "Set in Settings")}
          </Link>
        </div>
      )}

      {/* Status tabs */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <StatusFilterTabs
            activeValue={statusTab}
            tabs={STATUS_TABS.map((tab) => ({
              value: tab,
              label: tabLabel(tab, lang),
              href: buildInvoicesHref({ ...filtersForHref, status: tab, page: 1 }),
              count: tabCount(tab),
              alwaysShow:
                tab === "all" ||
                tab === "draft" ||
                tab === "paid" ||
                tab === "sent" ||
                tab === "archived",
            }))}
          />
        </div>
      </div>

      {hasExtraFilters && (
        <p className="-mt-2 text-xs text-muted-foreground">
          {t("Filter aktif:", "Active filters:")}{" "}
          {selectedClient
            ? selectedClient.companyName || selectedClient.name
            : t("Semua klien", "All clients")}
          {" · "}
          {projectId ? projectOptions.find((p) => p.id === projectId)?.name ?? t("Proyek terpilih", "Selected project") : t("Semua proyek", "All projects")}
          {" · "}
          {billingFilterLabel(billing, lang)}
        </p>
      )}

      {totalAllIncludingArchived === 0 && !hasExtraFilters ? (
        <EmptyState
          icon={FileText}
          title={t("Belum ada invoice", "No invoices yet")}
          description={t("Buat invoice pertama untuk mulai tagih klienmu.", "Create your first invoice to start billing clients.")}
          action={{ label: t("Buat invoice", "Create invoice"), href: "/app/invoices/new" }}
        />
      ) : filteredTotal === 0 ? (
        <EmptyState
          icon={FileText}
          title={
            statusTab === "archived"
              ? t("Belum ada invoice di arsip", "No archived invoices")
              : hasExtraFilters
                ? t("Tidak ada invoice cocok filter", "No invoices match filters")
                : t("Tidak ada invoice di tab ini", "No invoices in this tab")
          }
          description={
            statusTab === "archived"
              ? t(
                  "Ubah status invoice ke \"archived\" lewat Edit Invoice untuk arsipkan.",
                  'Set invoice status to "archived" in Edit Invoice to archive it.',
                )
              : hasExtraFilters
                ? t(
                    "Coba ganti klien / jenis proyek, atau reset filter.",
                    "Try another client / project type, or reset filters.",
                  )
                : t(
                    "Coba tab status lain, atau buat invoice baru.",
                    "Try another status tab, or create a new invoice.",
                  )
          }
        />
      ) : (
        <>
          <InvoicesListTable
            invoices={invoiceListWithBase}
            baseCurrency={baseCurrency}
            clientOptions={clientOptions.map((c) => ({ id: c.id, name: c.companyName || c.name }))}
            projectOptions={projectOptions}
            currentFilters={{ status: statusTab, clientId, projectId, billing }}
          />

          {/* Pagination */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {t(
                `Menampilkan ${fromItem}–${toItem} dari ${filteredTotal}`,
                `Showing ${fromItem}–${toItem} of ${filteredTotal}`,
              )}
              {` · ${t(`${PAGE_SIZE}/halaman`, `${PAGE_SIZE}/page`)}`}
            </p>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link href={buildInvoicesHref({ ...filtersForHref, page: currentPage - 1 })}>
                  <Button variant="outline" size="sm" className="gap-1">
                    <ChevronLeft className="h-4 w-4" />
                    {t("Sebelumnya", "Previous")}
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  <ChevronLeft className="h-4 w-4" />
                  {t("Sebelumnya", "Previous")}
                </Button>
              )}
              <span className="min-w-[4.5rem] text-center text-xs tabular-nums text-muted-foreground sm:text-sm">
                {currentPage}/{totalPages}
              </span>
              {currentPage < totalPages ? (
                <Link href={buildInvoicesHref({ ...filtersForHref, page: currentPage + 1 })}>
                  <Button variant="outline" size="sm" className="gap-1">
                    {t("Berikutnya", "Next")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" className="gap-1" disabled>
                  {t("Berikutnya", "Next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
