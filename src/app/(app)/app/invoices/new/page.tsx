import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { clients, invoiceTemplates, projects, packages, workspaceCurrencyRates, workspaces, timeEntries } from "@/db/schema";
import { eq, asc, and, inArray, isNotNull, sql } from "drizzle-orm";
import { requireWorkspaceWritableOrRedirect } from "@/lib/require-workspace-owner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvoiceForm } from "@/components/forms/invoice-form";
import { parseUuidList } from "@/lib/finance-tabs";
import { loadInvoiceSourceProjectOptions } from "@/lib/invoice-source-options";
import { resolveProjectAmount } from "@/lib/invoice-project-items";

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ timeEntryIds?: string | string[] }> }) {
  const { workspaceId } = await requireWorkspaceWritableOrRedirect("/app/invoices");
  const requestedIds = parseUuidList((await searchParams).timeEntryIds);
  const selectedTimeEntries = requestedIds.length ? await db.select({ id: timeEntries.id, clientId: timeEntries.clientId, projectId: timeEntries.projectId, description: timeEntries.description, durationMinutes: timeEntries.durationMinutes, hourlyRate: timeEntries.hourlyRate }).from(timeEntries).where(and(inArray(timeEntries.id, requestedIds), eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.status, "approved"), eq(timeEntries.billable, true), isNotNull(timeEntries.endTime), sql`${timeEntries.durationMinutes} > 0`)) : [];
  const selectedClientId = selectedTimeEntries.length && selectedTimeEntries.every(row => row.clientId === selectedTimeEntries[0].clientId) ? selectedTimeEntries[0].clientId : undefined;
  const selectedProjectIds = Array.from(new Set(selectedTimeEntries.map(row => row.projectId).filter((id): id is string => Boolean(id))));

  const clientOptions = await db
    .select({
      id: clients.id,
      name: clients.name,
      companyName: clients.companyName,
    })
    .from(clients)
    .where(eq(clients.workspaceId, workspaceId))
    .orderBy(asc(clients.companyName), asc(clients.name));

  const templateOptions = await db
    .select({
      id: invoiceTemplates.id,
      name: invoiceTemplates.name,
      defaultCurrency: invoiceTemplates.defaultCurrency,
      defaultTaxRate: invoiceTemplates.defaultTaxRate,
      notes: invoiceTemplates.notes,
      terms: invoiceTemplates.terms,
    })
    .from(invoiceTemplates)
    .where(eq(invoiceTemplates.workspaceId, workspaceId))
    .orderBy(asc(invoiceTemplates.name));

  const projectOptions = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
      billingType: projects.billingType,
      currency: projects.currency,
      budget: projects.budget,
      rate: projects.rate,
      packagePrice: packages.price,
      packageCustomPrice: packages.customPrice,
    })
    .from(projects)
    .leftJoin(packages, eq(projects.selectedPackageId, packages.id))
    .where(eq(projects.workspaceId, workspaceId))
    .orderBy(asc(projects.name));

  const sourceOptions = await loadInvoiceSourceProjectOptions({ workspaceId });
  const [workspace] = await db.select({ defaultCurrency: workspaces.defaultCurrency }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const currencyRates = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));


  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/app/invoices">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="app-page-title">Invoice Baru</h1>
          <p className="text-sm text-muted-foreground">
            Lengkapi detail dan item tagihan dalam satu langkah.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detail invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {clientOptions.length === 0 ? (
            <div className="space-y-3 rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Tambahkan klien sebelum membuat invoice.
              </p>
              <Link href="/app/clients/new">
                <Button>Tambah Klien</Button>
              </Link>
            </div>
          ) : (
            <InvoiceForm mode="create" defaultValues={{ clientId: selectedClientId ?? undefined, projectId: selectedProjectIds.length === 1 ? selectedProjectIds[0] : undefined }} clients={clientOptions} projects={projectOptions.map((project) => ({ ...project, agreedAmount: resolveProjectAmount({ billingType: project.billingType, budget: project.budget ? Number(project.budget) : null, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null }), priorActiveFixedBilledAmount: sourceOptions.get(project.id)?.priorActiveFixedBilledAmount ?? 0, eligibleTimeEntries: sourceOptions.get(project.id)?.eligibleTimeEntries ?? [], initialTimeEntryIds: selectedTimeEntries.filter((entry) => entry.projectId === project.id).map((entry) => entry.id) }))} templates={templateOptions} baseCurrency={workspace?.defaultCurrency || "IDR"} currencyRates={currencyRates} initialItems={selectedTimeEntries.map(row => ({ description: row.description || "Waktu proyek", quantity: Number(row.durationMinutes) / 60, unitPrice: Number(row.hourlyRate ?? 0), sourceId: row.id }))} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
