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
  projects,
  packages,
} from "@/db/schema";
import { eq, and, ne, sql } from "drizzle-orm";
import { requireUser, assertWorkspaceMember } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Eye, Share2 } from "lucide-react";
import { InvoiceItemManager } from "./add-item-button";
import { DeleteItemButton } from "./delete-item-button";
import { PaymentSection } from "./payment-section";
import { ShareTokenSection } from "./share-token-section";
import { SendInvoiceButton } from "./send-invoice-button";
import { SendReminderButton } from "./send-reminder-button";
import { DeleteInvoiceButton } from "./delete-invoice-button";
import { VoidInvoiceButton } from "./void-invoice-button";

import { InvoiceMetaForm } from "@/components/invoices/invoice-meta-form";
import { formatDateID, formatMoney } from "@/lib/utils";
import { invoiceStatusVariant } from "@/lib/status-badge";
import { getCurrentLang, createT } from "@/lib/i18n";
import { billingTypeLabel } from "@/lib/feature-access";
import { buildDefaultInvoiceMessage } from "@/lib/invoice-message";
import { decryptSecret } from "@/lib/google-calendar";
import { resolveFixedPriceInvoiceAmount } from "@/lib/invoice-project-items";
import { isInvoiceFinancialsMutable } from "@/lib/invoice-finance-rules";
import {
  buildInvoiceBackUrl,
  parseInvoiceOrigin,
  type InvoiceOrigin,
} from "@/lib/invoice-origin";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
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

  const requestedOrigin = parseInvoiceOrigin(await searchParams);
  let validatedOrigin: InvoiceOrigin | null =
    requestedOrigin?.type === "global" ? requestedOrigin : null;
  if (requestedOrigin?.type === "project") {
    const [originProject] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, requestedOrigin.resourceId),
          eq(projects.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (originProject) validatedOrigin = requestedOrigin;
  }
  if (requestedOrigin?.type === "client") {
    const [originClient] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.id, requestedOrigin.resourceId),
          eq(clients.workspaceId, workspaceId),
        ),
      )
      .limit(1);
    if (originClient) validatedOrigin = requestedOrigin;
  }
  const backUrl = buildInvoiceBackUrl(validatedOrigin);

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

  const sameClientProjects = await db.select({ id: projects.id, name: projects.name, billingType: projects.billingType, billingModel: projects.billingModel, budget: projects.budget, currency: projects.currency })
    .from(projects)
    .where(and(eq(projects.workspaceId, workspaceId), eq(projects.clientId, inv.clientId), ne(projects.status, "cancelled"), ne(projects.status, "archived")));
  const eligibleProjectItems = [] as Array<{ id: string; name: string; amount: number; currency: string }>;
  for (const project of sameClientProjects) {
    if ((project.billingModel ?? project.billingType) !== "fixed_price" && project.billingType !== "project") continue;
    const [prior] = await db.select({ amount: sql<string>`coalesce(sum(${invoiceItems.originalAmount}), '0')` }).from(invoiceItems)
      .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
      .where(and(eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, project.id), eq(invoices.workspaceId, workspaceId), ne(invoices.status, "cancelled"), ne(invoices.status, "archived")));
    const amount = resolveFixedPriceInvoiceAmount(Number(project.budget ?? 0), Number(prior?.amount ?? 0));
    if (amount > 0 && !items.some((item) => item.sourceType === "project" && item.sourceId === project.id)) eligibleProjectItems.push({ id: project.id, name: project.name, amount, currency: project.currency });
  }

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

  const totalPaid = pays.reduce((sum, p) => sum + Number(p.amount), 0);
  const financialsMutable = isInvoiceFinancialsMutable(inv.status);

  const hasShareToken = inv.sharedTokenHash && !inv.sharedTokenRevokedAt;
  const shareExpired = inv.sharedTokenExpiresAt
    ? new Date(inv.sharedTokenExpiresAt) < new Date()
    : false;
  let existingShareToken: string | null = null;
  if (hasShareToken && !shareExpired && inv.sharedTokenEnc) {
    try {
      existingShareToken = decryptSecret(inv.sharedTokenEnc);
    } catch {
      existingShareToken = null;
    }
  }

  const isPaid = Number(inv.total) > 0 && totalPaid >= Number(inv.total);
  // DB status is the source of truth for the badge. A manually marked "paid"
  // invoice (without a recorded payment row) must still show "Lunas".
  // Only override upward to "paid" when payments cover the total but the DB
  // status hasn't been updated yet — never downgrade a "paid" status to
  // "payment due" based on payment rows, and never override terminal
  // cancelled/archived statuses (a fully paid invoice that was voided must
  // still show "Dibatalkan").
  const displayStatus =
    ["cancelled", "archived"].includes(inv.status)
      ? inv.status
      : inv.status === "paid"
        ? "paid"
        : isPaid
          ? "paid"
          : inv.status;
  const voidable =
    !["cancelled", "archived"].includes(inv.status) &&
    (inv.status === "paid" || totalPaid > 0);
  const defaultInvoiceMessage = buildDefaultInvoiceMessage({
    clientName: client?.companyName || client?.name || t("Klien", "Client"),
    invoiceNumber: inv.invoiceNumber,
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    dueDate: inv.dueDate ? formatDateID(inv.dueDate) : null,
  });

  return (
    <div className="space-y-6 min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backUrl}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="app-page-title">
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
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={`/api/invoices/${invoiceId}/pdf`} target="_blank" rel="noreferrer">
              <Eye className="h-4 w-4" />
              {t("Pratinjau Invoice", "Invoice Preview")}
            </Link>
          </Button>
          <SendInvoiceButton
            invoiceId={invoiceId}
            defaultMessage={defaultInvoiceMessage}
            clientEmail={client?.email}
            defaultFrom={`${String(inv.issueDate).slice(0, 7)}-01`}
            defaultTo={String(inv.issueDate).slice(0, 10)}
            disabled={!client?.email || items.length === 0}
          />
          <SendReminderButton
            invoiceId={invoiceId}
            disabled={!client?.email || items.length === 0 || ["draft", "paid", "cancelled"].includes(inv.status)}
          />
          <VoidInvoiceButton
            invoiceId={invoiceId}
            disabled={!voidable}
          />
          <DeleteInvoiceButton
            invoiceId={invoiceId}
            disabled={!["draft", "cancelled"].includes(inv.status)}
            backUrl={backUrl}
          />
          <Badge
            variant={invoiceStatusVariant(displayStatus, lang).variant}
            className="text-sm px-3 py-1"
          >
            {invoiceStatusVariant(displayStatus, lang).label}
          </Badge>

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
          {financialsMutable ? (
            <InvoiceItemManager invoiceId={invoiceId} projectOptions={eligibleProjectItems} />
          ) : (
            <span className="text-xs font-normal text-muted-foreground">
              {t("Invoice final. Rincian item tidak dapat diubah.", "Final invoice. Line items cannot be changed.")}
            </span>
          )}
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
                    {financialsMutable ? <DeleteItemButton itemId={item.id} /> : null}
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

      {/* Edit meta */}
      <Card>
        <CardHeader>
          <CardTitle>{t("Edit Invoice", "Edit Invoice")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceMetaForm
            invoiceId={invoiceId}
            defaults={{
              invoiceNumber: inv.invoiceNumber,
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
            initialToken={existingShareToken}
          />
        </CardContent>
      </Card>
    </div>
  );
}
