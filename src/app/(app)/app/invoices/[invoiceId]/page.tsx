import { getWorkspaceForCurrentUser } from "@/lib/workspace";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  payments,
  clients,
  timeEntries,
  projects,
  workspaces,
  packages,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Share2, Download, Clock } from "lucide-react";
import { InvoiceItemManager } from "./add-item-button";
import { DeleteItemButton } from "./delete-item-button";
import { ImportTimeSection } from "./import-time-section";
import { PaymentSection } from "./payment-section";
import { ShareTokenSection } from "./share-token-section";
import { SendInvoiceButton } from "./send-invoice-button";
import { SendReminderButton } from "./send-reminder-button";
import { ExportTimesheetButton } from "./export-timesheet-button";
import { InvoiceMetaForm } from "@/components/invoices/invoice-meta-form";
import { formatDateID, formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";
import { billingTypeLabel } from "@/lib/feature-access";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  const lang = await getCurrentLang();
  const t = createT(lang);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(
      and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)),
    )
    .limit(1);

  if (!inv) notFound();

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const pays = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  // Project + package context (invoice created with a project)
  let invoiceProject: {
    name: string;
    billingType: string | null;
    billingTypeLabel: string;
    packageName?: string | null;
    packageHours?: number | null;
  } | null = null;
  if (inv.projectId) {
    const [proj] = await db
      .select({
        name: projects.name,
        billingType: projects.billingType,
        selectedPackageId: projects.selectedPackageId,
      })
      .from(projects)
      .where(eq(projects.id, inv.projectId))
      .limit(1);
    if (proj) {
      let packageName: string | null = null;
      let packageHours: number | null = null;
      if (proj.selectedPackageId) {
        const [pkg] = await db
          .select({ name: packages.name, hours: packages.hours })
          .from(packages)
          .where(eq(packages.id, proj.selectedPackageId))
          .limit(1);
        packageName = pkg?.name ?? null;
        packageHours = pkg?.hours ?? null;
      }
      invoiceProject = {
        name: proj.name,
        billingType: proj.billingType,
        billingTypeLabel: billingTypeLabel(proj.billingType, lang),
        packageName,
        packageHours,
      };
    }
  }

  // Workspace default hourly rate — used when entry/project rate is empty
  // (package/project billing often has no project.rate).
  const [wsRateRow] = await db
    .select({ defaultHourlyRate: workspaces.defaultHourlyRate })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  const workspaceDefaultRate = wsRateRow?.defaultHourlyRate
    ? Number(wsRateRow.defaultHourlyRate)
    : 0;

  // Fetch unbilled time entries for this invoice's project (fallback: client-wide
  // only when invoice has no project_id). Preview rate: entry → project → workspace.
  const unbilledTimeEntries = await db
    .select({
      id: timeEntries.id,
      description: timeEntries.description,
      durationMinutes: timeEntries.durationMinutes,
      hourlyRate: timeEntries.hourlyRate,
      startTime: timeEntries.startTime,
      status: timeEntries.status,
      projectRate: projects.rate,
      projectName: projects.name,
    })
    .from(timeEntries)
    .leftJoin(projects, eq(projects.id, timeEntries.projectId))
    .where(
      and(
        eq(timeEntries.workspaceId, workspaceId),
        eq(timeEntries.clientId, inv.clientId),
        eq(timeEntries.billable, true),
        // Invoice made with a project → only that project's unbilled time.
        inv.projectId ? eq(timeEntries.projectId, inv.projectId) : undefined,
      ),
    )
    .limit(200);

  const unbilled = unbilledTimeEntries
    .filter((t) => t.status !== "invoiced")
    .map((t) => {
      const entryRate = t.hourlyRate ? Number(t.hourlyRate) : 0;
      const projectRate = t.projectRate ? Number(t.projectRate) : 0;
      const effectiveRate =
        entryRate > 0
          ? entryRate
          : projectRate > 0
            ? projectRate
            : workspaceDefaultRate > 0
              ? workspaceDefaultRate
              : 0;
      return {
        id: t.id,
        description: t.description,
        durationMinutes: t.durationMinutes,
        hourlyRate: t.hourlyRate,
        startTime: t.startTime,
        status: t.status,
        effectiveRate,
        projectName: t.projectName,
      };
    });

  const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);

  const hasShareToken = inv.sharedTokenHash && !inv.sharedTokenRevokedAt;
  const shareExpired = inv.sharedTokenExpiresAt
    ? new Date(inv.sharedTokenExpiresAt) < new Date()
    : false;

  const isPaid = Number(inv.total) > 0 && totalPaid >= Number(inv.total);
  const displayStatus = inv.status === "paid" && !isPaid ? "payment due" : inv.status;

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/app/invoices">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Invoice {inv.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              {client ? client.companyName || client.name : t("Klien tidak diketahui", "Unknown Client")}
            </p>
            {invoiceProject ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {invoiceProject.name}
                {" · "}
                {invoiceProject.billingTypeLabel}
                {invoiceProject.billingType === "package" && invoiceProject.packageName
                  ? ` · ${invoiceProject.packageName}${
                      invoiceProject.packageHours != null
                        ? ` (${invoiceProject.packageHours}${t(" jam", "h")})`
                        : ""
                    }`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" className="gap-2" asChild>
            <Link href={`/api/invoices/${invoiceId}/pdf`} target="_blank">
              <Download className="h-4 w-4" />
              {t("Unduh PDF", "Download PDF")}
            </Link>
          </Button>
          {inv.clientId ? (
            <ExportTimesheetButton
              clientId={inv.clientId}
              projectId={inv.projectId}
              label={t("Ekspor Timesheet", "Export Timesheet")}
            />
          ) : null}
          <SendInvoiceButton invoiceId={invoiceId} disabled={!client?.email || items.length === 0} />
          <SendReminderButton
            invoiceId={invoiceId}
            disabled={!client?.email || items.length === 0 || ["draft", "paid", "cancelled"].includes(inv.status)}
          />
          <Badge
            variant={invoiceStatusVariant(displayStatus, lang).variant}
            className="text-sm px-3 py-1"
          >
            {invoiceStatusVariant(displayStatus, lang).label}
          </Badge>
          {isPaid && inv.status !== "paid" && (
            <Badge variant="success" className="text-sm px-3 py-1">
              {t("Lunas", "Paid")}
            </Badge>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              {t("Tanggal Terbit", "Issue Date")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {formatDateID(inv.issueDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              {t("Jatuh Tempo", "Due Date")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {formatDateID(inv.dueDate)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              {t("Mata Uang", "Currency")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{inv.currency}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase text-muted-foreground">
              {t("Total", "Total")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-bold font-mono">
              {formatMoney(inv.total, inv.currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("Rincian Item", "Line Items")}</CardTitle>
          <InvoiceItemManager invoiceId={invoiceId} />
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {t("Belum ada item. Tambahkan item ke invoice ini.", "No items yet. Add items to this invoice.")}
            </p>
          ) : (
            <div className="space-y-0">
              <div className="flex items-center gap-2 py-2 text-xs uppercase text-muted-foreground border-b sm:gap-4">
                <div className="min-w-0 flex-1">{t("Deskripsi", "Description")}</div>
                <div className="w-14 text-right sm:w-20">{t("Qty", "Qty")}</div>
                <div className="w-24 text-right sm:w-32">{t("Tarif", "Rate")}</div>
                <div className="w-24 text-right sm:w-32">{t("Jumlah", "Amount")}</div>
                <div className="w-6 sm:w-10" />
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 py-2 border-b last:border-0 text-sm sm:gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{item.description}</p>
                    {item.sourceType === "time_entry" && (
                      <span className="text-xs text-muted-foreground">
                        {t("(dari catatan waktu)", "(from time entry)")}
                      </span>
                    )}
                  </div>
                  <div className="w-14 text-right sm:w-20">
                    {Number(item.quantity).toFixed(2)}
                  </div>
                  <div className="w-24 text-right font-mono whitespace-nowrap sm:w-32">
                    {formatMoney(item.unitPrice, inv.currency)}
                  </div>
                  <div className="w-24 text-right font-mono font-medium whitespace-nowrap sm:w-32">
                    {formatMoney(item.amount, inv.currency)}
                  </div>
                  <div className="w-6 text-right sm:w-10">
                    <DeleteItemButton itemId={item.id} />
                  </div>
                </div>
              ))}

              <Separator className="my-2" />
              <div className="space-y-1 pt-2">
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-muted-foreground">{t("Subtotal", "Subtotal")}</span>
                  <span className="font-mono w-32 text-right whitespace-nowrap">
                    {formatMoney(inv.subtotal, inv.currency)}
                  </span>
                </div>
                <div className="flex justify-end gap-8 text-sm">
                  <span className="text-muted-foreground">{t("Pajak", "Tax")}</span>
                  <span className="font-mono w-32 text-right whitespace-nowrap">
                    {formatMoney(inv.tax, inv.currency)}
                  </span>
                </div>
                <div className="flex justify-end gap-8 text-base font-bold pt-1">
                  <span>{t("Total", "Total")}</span>
                  <span className="font-mono w-32 text-right whitespace-nowrap">
                    {formatMoney(inv.total, inv.currency)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Time */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> {t("Import Catatan Waktu", "Import Time Entries")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ImportTimeSection invoiceId={invoiceId} timeEntries={unbilled} currency={inv.currency} />
        </CardContent>
      </Card>

      {/* Edit meta */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Edit Invoice", "Edit Invoice")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceMetaForm
            invoiceId={invoiceId}
            defaults={{
              status: inv.status,
              issueDate: String(inv.issueDate),
              dueDate: inv.dueDate ? String(inv.dueDate) : null,
              currency: inv.currency,
              tax: inv.tax,
              discount: inv.discount,
              notes: inv.notes,
              terms: inv.terms,
            }}
            project={invoiceProject}
          />
        </CardContent>
      </Card>

      {/* Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Pembayaran", "Payments")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentSection
            invoiceId={invoiceId}
            payments={pays.map((p) => ({
              ...p,
              paidAt: p.paidAt ? String(p.paidAt) : null,
              createdAt: String(p.createdAt),
            }))}
            total={Number(inv.total)}
            currency={inv.currency}
          />
        </CardContent>
      </Card>

      {/* Share Token */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-4 w-4" /> {t("Link Berbagi Invoice", "Invoice Share Link")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ShareTokenSection
            invoiceId={invoiceId}
            hasToken={!!hasShareToken}
            isExpired={shareExpired}
          />
        </CardContent>
      </Card>
    </div>
  );
}
