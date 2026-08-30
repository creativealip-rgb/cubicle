"use server";
import { getCurrentLang, createT } from "@/lib/i18n";

async function getT() {
  const lang = await getCurrentLang();
  return createT(lang);
}
import { getWorkspaceForCurrentUser } from "@/lib/workspace";

import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import {
  invoices,
  invoiceItems,
  payments,
  workspaceInvoiceCounters,
  timeEntries,
  workspaces,
  clients,
  projects,
  packages,
  projectServices,
  workspaceCurrencyRates,
} from "@/db/schema";
import { eq, and, desc, sql, inArray, lt, isNotNull, ne, or } from "drizzle-orm";
import { z } from "zod";
import { createHash, randomBytes } from "crypto";
import { requireUser, assertWorkspaceWritable, assertWorkspaceMember } from "@/lib/access";
import { writeActivityLog } from "@/lib/actions/activity";
import { notifyInvoicePaymentReminder, notifyInvoiceSent } from "@/lib/notifications";
import { notifyWorkspaceMembers } from "@/lib/in-app-notifications";
import { formatMoney } from "@/lib/utils";
import { assertPaymentWithinRemaining } from "@/lib/invoice-payment-rules";
import {
  assertInvoiceFinancialsMutable,
  calculateInvoiceTotals,
  isInvoiceStatusTransitionAllowed,
} from "@/lib/invoice-finance-rules";
import { validateInvoiceMessage } from "@/lib/invoice-message";
import { buildInvoiceReportUrl, normalizeInvoiceReportRange, signInvoiceReportRange } from "@/lib/invoice-report-options";
import { resolveWorkspaceReplyTo } from "@/lib/workspace-reply-to";
import { buildRateMap } from "@/lib/currency-base";
import { convertCurrency, resolveFixedPriceInvoiceAmount, resolveProjectAmount } from "@/lib/invoice-project-items";
import { buildProjectServiceDocumentLines } from "@/lib/project-service-lines";
import { assertBillingModelAllowsTimeInvoice, resolveBillingModel } from "@/lib/billing-model";
import { invoiceNumberTakenMessage, isInvoiceNumberUniqueConstraint, normalizeInvoiceNumber } from "@/lib/invoice-number";
import { encryptSecret } from "@/lib/google-calendar";
import { ProjectInvoiceSourceSchema, billingDateInTimezone, isFixedInvoiceBillingModel, resolveFixedSourceAmount } from "@/lib/project-invoice-sources";

async function getWorkspaceId(): Promise<string> {
  return getWorkspaceForCurrentUser();
}

// ─── Schemas ───

const createInvoiceSchema = z.object({
  clientId: z.string(),
  projectId: z.string().optional(),
  projectIds: z.array(z.string()).optional(),
  projectSources: z.array(ProjectInvoiceSourceSchema).optional(),
  scopedProjectId: z.string().uuid().optional(),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().optional(),
  currency: z.string().default("USD"),
  notes: z.string().optional(),
  terms: z.string().optional(),
  invoiceNumber: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
    sourceId: z.string().optional(),
  })).default([]),
});

const updateInvoiceSchema = z.object({
  clientId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  currency: z.string().optional(),
  status: z.enum(["draft", "sent", "viewed", "paid", "overdue", "cancelled", "archived"]).optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discount: z.number().optional(),
  tax: z.number().optional(),
  invoiceNumber: z.string().optional(),
});

const addItemSchema = z.object({
  invoiceId: z.string().uuid(),
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
});

export async function getProposedInvoiceNumber(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceForCurrentUser();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const [counter] = await db.select({ nextNumber: workspaceInvoiceCounters.nextNumber })
    .from(workspaceInvoiceCounters).where(eq(workspaceInvoiceCounters.workspaceId, workspaceId)).limit(1);
  const [maxRow] = await db.select({
    maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber} FROM 'INV-([0-9]+)$') AS INTEGER)), 0)`,
  }).from(invoices).where(eq(invoices.workspaceId, workspaceId));
  return `INV-${String(Math.max(counter?.nextNumber ?? 1, Number(maxRow?.maxNum ?? 0) + 1)).padStart(4, "0")}`;
}

const addProjectItemSchema = z.object({
  invoiceId: z.string().uuid(),
  projectId: z.string().uuid(),
});

const updateItemSchema = z.object({
  description: z.string().min(1).optional(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().min(0).optional(),
});

const importTimeSchema = z.object({
  invoiceId: z.string().uuid(),
  timeEntryIds: z.array(z.string().uuid()),
});

const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paidAt: z.string().min(1),
  method: z.string().optional(),
  notes: z.string().optional(),
});

async function assertInvoiceInWorkspace(invoiceId: string, workspaceId: string) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  const t = await getT();
  if (!inv) throw new Error(t("Invoice tidak ditemukan", "Invoice not found"));
  return inv;
}

// ─── CRUD ───

export async function createInvoice(input: z.infer<typeof createInvoiceSchema>) {
  console.log("--> SERVER ACTION RECEIVED INPUT:", input);
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const t = await getT();

  // Check plan limits (plan is per-user, not per-workspace)
  const { getUserPlan, checkEntityLimit } = await import("@/lib/plan");
  const plan = await getUserPlan(user.id);
  const invLimit = await checkEntityLimit(workspaceId, "invoices", plan);
  if (!invLimit.allowed) {
    throw new Error(invLimit.reason!);
  }

  const parsed = createInvoiceSchema.parse(input);

  if (parsed.scopedProjectId && ((parsed.projectId && parsed.projectId !== parsed.scopedProjectId) || parsed.projectIds?.some((id) => id !== parsed.scopedProjectId) || parsed.projectSources?.some((source) => source.projectId !== parsed.scopedProjectId))) {
    throw new Error("Project scope tidak sesuai");
  }

  const [validClient] = await db.select({ id: clients.id }).from(clients).where(and(
    eq(clients.id, parsed.clientId),
    eq(clients.workspaceId, workspaceId),
  )).limit(1);
  if (!validClient) throw new Error("Klien tidak ditemukan");

  if (parsed.projectId) {
    const [validProject] = await db.select({ id: projects.id }).from(projects).where(and(
      eq(projects.id, parsed.projectId),
      eq(projects.workspaceId, workspaceId),
      eq(projects.clientId, parsed.clientId),
    )).limit(1);
    if (!validProject) throw new Error("Proyek tidak sesuai dengan klien");
  }

  const [ws] = await db
    .select({ defaultCurrency: workspaces.defaultCurrency, defaultTaxRate: workspaces.defaultTaxRate, defaultInvoiceTerms: workspaces.defaultInvoiceTerms, timezone: workspaces.timezone })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const explicitSources = parsed.projectSources ?? [];
  const sourceProjectIds = explicitSources.map((source) => source.projectId);
  if (new Set(sourceProjectIds).size !== sourceProjectIds.length) throw new Error("Satu proyek hanya boleh memiliki satu source invoice");
  const projectIds = Array.from(new Set(sourceProjectIds.length ? sourceProjectIds : parsed.projectIds ?? (parsed.projectId ? [parsed.projectId] : [])));
  if ((parsed.projectIds?.length ?? 0) !== projectIds.length) throw new Error("Proyek duplikat tidak diizinkan");
  if (!(parsed.items?.length || explicitSources.length || projectIds.length)) throw new Error("Tambahkan minimal satu item atau sumber tagihan");
  const rateRows = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const rateMap = buildRateMap(rateRows);
  const projectItemValues: Array<{ description: string; quantity: number; unitPrice: number; sourceId: string; sourceMode: "fixed_full" | "fixed_dp" | "fixed_milestone" | "fixed_final" | "hourly_deposit" | "hourly_timesheet"; sourceMetadata: { milestoneName?: string; requestedPercent?: string } | null; originalCurrency: string; originalAmount: number; conversionRate: number }> = [];
  const projectServiceItemValues: Array<{ description: string; quantity: number; unitPrice: number; sourceId: string; originalCurrency: string; originalAmount: number; conversionRate: number }> = [];
  for (const projectId of projectIds) {
    const [project] = await db.select({ id: projects.id, name: projects.name, billingModel: projects.billingModel, billingType: projects.billingType, budget: projects.budget, rate: projects.rate, currency: projects.currency, retainerFee: projects.retainerFee, packagePrice: packages.price, packageCustomPrice: packages.customPrice }).from(projects).leftJoin(packages, eq(projects.selectedPackageId, packages.id)).where(and(eq(projects.id, projectId), eq(projects.workspaceId, workspaceId), eq(projects.clientId, parsed.clientId))).limit(1);
    if (!project) throw new Error("Ada proyek yang tidak sesuai dengan klien");
    const source = explicitSources.find((candidate) => candidate.projectId === project.id);
    const effectiveBudget = project.billingModel === "retainer" && project.retainerFee ? Number(project.retainerFee) : project.budget ? Number(project.budget) : null;
    let originalAmount = resolveProjectAmount({ billingType: project.billingType, budget: effectiveBudget, rate: project.rate ? Number(project.rate) : null, packagePrice: Number(project.packageCustomPrice ?? project.packagePrice ?? 0) || null });
    let sourceMode: "fixed_full" | "fixed_dp" | "fixed_milestone" | "fixed_final" | "hourly_deposit" | "hourly_timesheet" = isFixedInvoiceBillingModel(resolveBillingModel(project)) ? "fixed_final" : "hourly_timesheet";
    let sourceMetadata: { milestoneName?: string; requestedPercent?: string } | null = null;
    if (source?.mode === "hourly_timesheet") continue;
    if (source?.mode === "hourly_deposit") {
      // Hourly deposit flow (DP / bayaran di awal untuk projek per jam)
      originalAmount = Number((source as any).amount ?? (source as any).value ?? 0);
      sourceMode = "hourly_deposit";
    } else if (isFixedInvoiceBillingModel(resolveBillingModel(project))) {
      const priorRows = await db
        .select({ amount: invoiceItems.originalAmount })
        .from(invoiceItems)
        .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
        .where(and(
          eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, project.id), eq(invoices.workspaceId, workspaceId),
          inArray(invoices.status, ["draft", "sent", "viewed", "paid", "overdue"]),
          inArray(invoiceItems.sourceMode, ["fixed_full", "fixed_dp", "fixed_milestone", "fixed_final"]),
        ));
      const fixedSource = source && source.mode.startsWith("fixed_") ? source : { mode: "fixed_final" as const, projectId: project.id };
      originalAmount = Number(resolveFixedSourceAmount(fixedSource, { agreedAmount: originalAmount, priorActiveOriginalAmounts: priorRows.flatMap((row) => row.amount == null ? [] : [row.amount]) }));
      sourceMode = fixedSource.mode;
      sourceMetadata = {
        ...(fixedSource.mode === "fixed_milestone" && fixedSource.milestoneName ? { milestoneName: fixedSource.milestoneName } : {}),
        ...("amountType" in fixedSource && fixedSource.amountType === "percent" ? { requestedPercent: String(fixedSource.value) } : "percentage" in fixedSource ? { requestedPercent: String(fixedSource.percentage) } : {}),
      };
    } else if (source) {
      throw new Error("Source invoice tidak sesuai model billing proyek");
    }
    if (resolveBillingModel(project) === "hourly" && !source) continue;
    // For fixed-price projects with an explicit source (DP/milestone/full),
    // skip service rows — the source amount IS the invoice line, not the services.
    const skipServices = source && source.mode.startsWith("fixed_");
    if (!skipServices) {
      const serviceRows = await db
        .select({
          id: projectServices.id,
          nameSnapshot: projectServices.nameSnapshot,
          descriptionSnapshot: sql<string | null>`COALESCE(${projectServices.descriptionSnapshot}, '')`,
          quantity: projectServices.quantity,
          unitPrice: projectServices.unitPrice,
          amount: projectServices.amount,
          currencySnapshot: projectServices.currencySnapshot,
          status: projectServices.status,
        })
        .from(projectServices)
        .where(and(
          eq(projectServices.workspaceId, workspaceId),
          eq(projectServices.projectId, projectId),
          eq(projectServices.status, "active"),
        ));
      if (serviceRows.length) {
        for (const row of serviceRows) {
          const [line] = buildProjectServiceDocumentLines([row], row.currencySnapshot);
          const converted = convertCurrency(line.amount, line.originalCurrency, parsed.currency || ws?.defaultCurrency || "IDR", ws?.defaultCurrency || "IDR", rateMap);
          if (!converted) throw new Error(`Kurs ${line.originalCurrency} ke ${parsed.currency} belum tersedia`);
          projectServiceItemValues.push({
            description: line.description,
            quantity: line.quantity,
            unitPrice: converted.amount / line.quantity,
            sourceId: line.sourceId,
            originalCurrency: line.originalCurrency,
            originalAmount: line.amount,
            conversionRate: converted.rate,
          });
        }
      }
    }
    const converted = convertCurrency(originalAmount, project.currency, parsed.currency || ws?.defaultCurrency || "IDR", ws?.defaultCurrency || "IDR", rateMap);
    if (!converted) throw new Error(`Kurs ${project.currency} ke ${parsed.currency} belum tersedia`);
    projectItemValues.push({ description: source?.mode === "hourly_deposit" ? (source.description || `Deposit ${project.name}`) : project.name, quantity: 1, unitPrice: converted.amount, sourceId: project.id, sourceMode, sourceMetadata, originalCurrency: project.currency, originalAmount, conversionRate: converted.rate });
  }

  const invoice = await db.transaction(async (tx) => {
    // Serialize invoice creation per project. This closes stale Fixed remaining races
    // and also keeps mixed-source project resolution deterministic.
    for (const projectId of [...projectIds].sort()) {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`invoice-source:${workspaceId}:${projectId}`}))`);
    }
    // Revalidate every precomputed Fixed amount under the project lock.
    for (const item of projectItemValues.filter((value) => value.sourceMode.startsWith("fixed_"))) {
      const [lockedProject] = await tx.select({ billingType: projects.billingType, budget: projects.budget, retainerFee: projects.retainerFee, rate: projects.rate, packagePrice: packages.price, packageCustomPrice: packages.customPrice }).from(projects).leftJoin(packages, eq(projects.selectedPackageId, packages.id)).where(and(eq(projects.id, item.sourceId), eq(projects.workspaceId, workspaceId), eq(projects.clientId, parsed.clientId))).limit(1);
      if (!lockedProject) throw new Error("Proyek Fixed Price tidak ditemukan saat invoice dibuat");
      const agreedAmount = resolveProjectAmount({ billingType: lockedProject.billingType, budget: lockedProject.billingType === "retainer" && lockedProject.retainerFee ? Number(lockedProject.retainerFee) : lockedProject.budget ? Number(lockedProject.budget) : null, rate: lockedProject.rate ? Number(lockedProject.rate) : null, packagePrice: Number(lockedProject.packageCustomPrice ?? lockedProject.packagePrice ?? 0) || null });
      const priorRows = await tx.select({ amount: invoiceItems.originalAmount }).from(invoiceItems).innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId)).where(and(eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, item.sourceId), eq(invoices.workspaceId, workspaceId), inArray(invoices.status, ["draft", "sent", "viewed", "paid", "overdue"]), inArray(invoiceItems.sourceMode, ["fixed_full", "fixed_dp", "fixed_milestone", "fixed_final"])));
      const selectedSource = explicitSources.find((source) => source.projectId === item.sourceId && source.mode.startsWith("fixed_"));
      const fixedSource = selectedSource && selectedSource.mode.startsWith("fixed_")
        ? selectedSource as Extract<typeof selectedSource, { mode: "fixed_full" | "fixed_dp" | "fixed_milestone" | "fixed_final" }>
        : { mode: "fixed_final" as const, projectId: item.sourceId };
      const lockedOriginalAmount = Number(resolveFixedSourceAmount(fixedSource, { agreedAmount, priorActiveOriginalAmounts: priorRows.flatMap((row) => row.amount == null ? [] : [row.amount]) }));
      const converted = convertCurrency(lockedOriginalAmount, item.originalCurrency, parsed.currency || ws?.defaultCurrency || "IDR", ws?.defaultCurrency || "IDR", rateMap);
      if (!converted) throw new Error(`Kurs ${item.originalCurrency} ke ${parsed.currency} belum tersedia`);
      item.originalAmount = lockedOriginalAmount;
      item.unitPrice = converted.amount;
      item.conversionRate = converted.rate;
    }
    // Generate invoice number inside transaction.
    // Counter is authoritative, but always bump above MAX(existing INV-####)
    // so seed data / manual inserts cannot collide with the unique constraint.
    const [counter] = await tx
      .select()
      .from(workspaceInvoiceCounters)
      .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId))
      .for("update")
      .limit(1);

    const [maxRow] = await tx
      .select({
        maxNum: sql<number>`COALESCE(MAX(CAST(SUBSTRING(${invoices.invoiceNumber} FROM 'INV-([0-9]+)$') AS INTEGER)), 0)`,
      })
      .from(invoices)
      .where(eq(invoices.workspaceId, workspaceId));

    const maxExisting = Number(maxRow?.maxNum ?? 0);
    const counterNext = counter?.nextNumber ?? 1;
    const nextNum = Math.max(counterNext, maxExisting + 1);
    const invoiceNumber = normalizeInvoiceNumber(parsed.invoiceNumber) ?? `INV-${String(nextNum).padStart(4, "0")}`;

    if (!counter) {
      await tx.insert(workspaceInvoiceCounters).values({
        workspaceId,
        nextNumber: nextNum + 1,
      });
    } else {
      await tx
        .update(workspaceInvoiceCounters)
        .set({ nextNumber: nextNum + 1, updatedAt: new Date() })
        .where(eq(workspaceInvoiceCounters.workspaceId, workspaceId));
    }

    try {
      const [inv] = await tx
        .insert(invoices)
        .values({
          workspaceId,
          clientId: parsed.clientId,
          projectId: projectIds.length === 1 ? projectIds[0] : null,
          billingSource: projectItemValues.length ? "fixed_price" : null,
          invoiceNumber,
          issueDate: parsed.issueDate,
          dueDate: parsed.dueDate || null,
          currency: parsed.currency || ws?.defaultCurrency || "USD",
          subtotal: "0",
          discount: "0",
          tax: "0",
          total: "0",
          status: "draft",
          notes: parsed.notes || null,
          terms: parsed.terms || ws?.defaultInvoiceTerms || null,
        })
        .returning();

      const hourlySources = explicitSources.filter((source) => source.mode === "hourly_timesheet");
      const legacySourceIds = parsed.items?.flatMap((item) => item.sourceId ? [item.sourceId] : []) ?? [];
      const hourlySourceIds = hourlySources.flatMap((source) => source.timeEntryIds);
      const sourceIds = Array.from(new Set([...legacySourceIds, ...hourlySourceIds]));
      if (sourceIds.length !== legacySourceIds.length + hourlySourceIds.length) throw new Error("Time Entry duplikat tidak diizinkan");
      const hourlyEntries = sourceIds.length ? await tx.select({
        id: timeEntries.id, projectId: timeEntries.projectId, description: timeEntries.description,
        durationMinutes: timeEntries.durationMinutes, hourlyRate: timeEntries.hourlyRate,
        workDate: timeEntries.workDate, startTime: timeEntries.startTime, projectName: projects.name,
      }).from(timeEntries).innerJoin(projects, and(eq(projects.id, timeEntries.projectId), eq(projects.workspaceId, timeEntries.workspaceId))).where(and(
        inArray(timeEntries.id, sourceIds), eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.clientId, parsed.clientId),
        eq(timeEntries.billable, true), eq(timeEntries.status, "approved"), or(isNotNull(timeEntries.endTime), isNotNull(timeEntries.manualMinutes)),
        sql`${timeEntries.durationMinutes} > 0`, sql`${timeEntries.hourlyRate} > 0`,
        projectIds.length ? inArray(timeEntries.projectId, projectIds) : sql`true`,
      )).for("update") : [];
      if (hourlyEntries.length !== sourceIds.length) throw new Error("Semua Time Entry harus approved, billable, selesai, positif, memiliki rate, dan sesuai invoice");
      for (const source of hourlySources) {
        const selected = hourlyEntries.filter((entry) => source.timeEntryIds.includes(entry.id));
        if (selected.length !== source.timeEntryIds.length || selected.some((entry) => entry.projectId !== source.projectId)) throw new Error("Time Entry tidak sesuai proyek Hourly");
        if (selected.some((entry) => {
          const billingDate = billingDateInTimezone(entry.workDate, entry.startTime, ws?.timezone ?? "UTC");
          return !billingDate || billingDate < source.periodStart || billingDate >= source.periodEnd;
        })) throw new Error("Time Entry berada di luar periode invoice");
      }
      if ((parsed.items?.length || projectItemValues.length || projectServiceItemValues.length || hourlyEntries.length) && inv) {
        const hourlyValues = hourlyEntries.filter((entry) => hourlySourceIds.includes(entry.id)).map((entry) => {
          const source = hourlySources.find((candidate) => candidate.timeEntryIds.includes(entry.id))!;
          const hours = Number(entry.durationMinutes) / 60;
          const rate = Number(entry.hourlyRate);
          return { invoiceId: inv.id, description: entry.projectName ? `${entry.projectName} — ${(entry.description || "").trim() || "Time entry"}` : ((entry.description || "").trim() || "Time entry"), quantity: String(hours), unitPrice: String(rate), amount: String(hours * rate), sourceType: "time_entry" as const, sourceId: entry.id, sourceMode: "hourly_timesheet" as const, sourceMetadata: { periodStart: source.periodStart, periodEnd: source.periodEnd }, previousTimeEntryStatus: "approved" as const, originalCurrency: null, originalAmount: null, conversionRate: null };
        });
        const values = [
          ...hourlyValues,
          ...projectItemValues.map((item) => ({ invoiceId: inv.id, description: item.description, quantity: "1", unitPrice: String(item.unitPrice), amount: String(item.unitPrice), sourceType: "project" as const, sourceId: item.sourceId, sourceMode: item.sourceMode, sourceMetadata: item.sourceMetadata, originalCurrency: item.originalCurrency, originalAmount: String(item.originalAmount), conversionRate: String(item.conversionRate) })),
          ...projectServiceItemValues.map((item) => ({ invoiceId: inv.id, description: item.description, quantity: String(item.quantity), unitPrice: String(item.unitPrice), amount: String(item.quantity * item.unitPrice), sourceType: "project" as const, sourceId: item.sourceId, originalCurrency: item.originalCurrency, originalAmount: String(item.originalAmount), conversionRate: String(item.conversionRate) })),
          ...(parsed.items ?? []).filter((item) => !item.sourceId || !hourlySourceIds.includes(item.sourceId)).map((item) => ({
          invoiceId: inv.id,
          description: item.description,
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          amount: String(item.quantity * item.unitPrice),
          sourceType: item.sourceId ? "time_entry" as const : "manual" as const,
          sourceMode: item.sourceId ? "hourly_timesheet" as const : "manual_adjustment" as const,
          sourceId: item.sourceId ?? null,
          previousTimeEntryStatus: item.sourceId ? "approved" as const : null,
          originalCurrency: null,
          originalAmount: null,
          conversionRate: null,
        })),
        ];
        await tx.insert(invoiceItems).values(values);
        if (sourceIds.length) {
          const transitioned = await tx.update(timeEntries).set({ status: "invoiced", updatedAt: new Date() }).where(and(inArray(timeEntries.id, sourceIds), eq(timeEntries.status, "approved"))).returning({ id: timeEntries.id });
          if (transitioned.length !== sourceIds.length) throw new Error("Time Entry berubah saat invoice dibuat. Muat ulang dan coba lagi");
        }
        const subtotal = values.reduce((sum, item) => sum + Number(item.amount), 0);
        const taxRate = Number(ws?.defaultTaxRate ?? 0) || 0;
        const tax = (subtotal * taxRate) / 100;
        const [refreshed] = await tx.update(invoices).set({
          subtotal: String(subtotal),
          tax: String(tax),
          total: String(subtotal + tax),
          updatedAt: new Date(),
        }).where(eq(invoices.id, inv.id)).returning();
        return refreshed ?? inv;
      }

      // Auto line item: project name + nominal dari project yang dipilih.
      if (parsed.projectId && inv) {
        const [proj] = await tx
          .select({
            id: projects.id,
            name: projects.name,
            clientId: projects.clientId,
            workspaceId: projects.workspaceId,
            billingType: projects.billingType,
            budget: projects.budget,
            rate: projects.rate,
            currency: projects.currency,
            selectedPackageId: projects.selectedPackageId,
          })
          .from(projects)
          .where(
            and(
              eq(projects.id, parsed.projectId),
              eq(projects.workspaceId, workspaceId),
              eq(projects.clientId, parsed.clientId),
            ),
          )
          .limit(1);

        if (proj) {
          let unitPrice = 0;
          if (proj.billingType === "project") {
            unitPrice = Number(proj.budget ?? 0) || 0;
          } else if (proj.billingType === "package" && proj.selectedPackageId) {
            const [pkg] = await tx
              .select({
                price: packages.price,
                customPrice: packages.customPrice,
              })
              .from(packages)
              .where(eq(packages.id, proj.selectedPackageId))
              .limit(1);
            if (pkg) {
              unitPrice = Number(pkg.customPrice ?? pkg.price) || 0;
            }
          } else if (proj.billingType === "hours" || proj.billingType === "hourly" || resolveBillingModel(proj) === "hourly") {
            // Hours: seed project name only; amount 0 — isi via import timesheet / edit manual.
            unitPrice = 0;
          } else if (proj.budget != null) {
            unitPrice = Number(proj.budget) || 0;
          }

          // Always seed one line when project selected (name + amount)
          const amount = String(unitPrice);
          await tx.insert(invoiceItems).values({
            invoiceId: inv.id,
            description: proj.name,
            quantity: "1",
            unitPrice: amount,
            amount,
            sourceType: "manual",
          });

          // inv.tax on insert holds default tax RATE % (same as recalculateInvoice)
          const taxRate = Number(ws?.defaultTaxRate ?? inv.tax ?? 0) || 0;
          const taxAmount = (unitPrice * taxRate) / 100;
          const total = unitPrice + taxAmount;
          await tx
            .update(invoices)
            .set({
              subtotal: amount,
              tax: String(taxAmount),
              total: String(total),
              currency: parsed.currency || proj.currency || inv.currency,
              updatedAt: new Date(),
            })
            .where(eq(invoices.id, inv.id));

          const [refreshed] = await tx
            .select()
            .from(invoices)
            .where(eq(invoices.id, inv.id))
            .limit(1);
          return refreshed ?? inv;
        }
      }

      return inv;
    } catch (err: unknown) {
      // Surface a clean message instead of opaque RSC production digest.
      if (isInvoiceNumberUniqueConstraint(err)) return {
        error: t(
          `Nomor invoice ${invoiceNumber} sudah dipakai di workspace ini`,
          `Invoice number ${invoiceNumber} already exists in this workspace`,
        ),
      } as const;
      throw err;
    }
  });

  if ("error" in invoice) return invoice;
  await writeActivityLog(workspaceId, user.id, "created_invoice", "invoice", invoice.id);
  return invoice;
}

export async function updateInvoice(invoiceId: string, input: z.infer<typeof updateInvoiceSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const parsed = updateInvoiceSchema.parse(input);
  const currentInvoice = await assertInvoiceInWorkspace(invoiceId, workspaceId);
  const nextClientId = parsed.clientId ?? currentInvoice.clientId;
  if (parsed.clientId !== undefined) {
    const [validClient] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, parsed.clientId), eq(clients.workspaceId, workspaceId))).limit(1);
    if (!validClient) throw new Error("Klien tidak ditemukan");
  }
  const nextProjectId = parsed.projectId ?? currentInvoice.projectId;
  if (nextProjectId) {
    const [validProject] = await db.select({ id: projects.id, clientId: projects.clientId }).from(projects).where(and(eq(projects.id, nextProjectId), eq(projects.workspaceId, workspaceId))).limit(1);
    if (!validProject) throw new Error("Proyek tidak ditemukan");
    if (validProject.clientId !== nextClientId) throw new Error("Proyek tidak sesuai dengan klien invoice");
  }
  if (parsed.status === "cancelled" && currentInvoice.status === "draft") {
    throw new Error("Gunakan aksi Batalkan Invoice untuk membatalkan draft");
  }
  // Guard invoice status transitions: paid/cancelled/archived are terminal and
  // invalid backwards transitions (e.g. sent -> draft) are rejected. External
  // flows (send email -> sent, portal -> viewed, cron -> overdue, payments ->
  // paid) mutate status outside this action and are unaffected.
  if (parsed.status !== undefined && parsed.status !== currentInvoice.status) {
    if (!isInvoiceStatusTransitionAllowed(currentInvoice.status, parsed.status)) {
      throw new Error("Status invoice tidak dapat diubah dari status saat ini");
    }
  }
  const changesFinancials =
    (parsed.currency !== undefined && parsed.currency !== currentInvoice.currency) ||
    (parsed.tax !== undefined && parsed.tax !== Number(currentInvoice.tax)) ||
    (parsed.discount !== undefined && parsed.discount !== Number(currentInvoice.discount));
  if (changesFinancials) {
    assertInvoiceFinancialsMutable(currentInvoice.status);
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.clientId !== undefined) updateData.clientId = parsed.clientId;
  if (parsed.issueDate !== undefined) updateData.issueDate = parsed.issueDate;
  if (parsed.dueDate !== undefined) updateData.dueDate = parsed.dueDate || null;
  if (parsed.currency !== undefined) updateData.currency = parsed.currency;
  if (parsed.status !== undefined) updateData.status = parsed.status;
  if (parsed.notes !== undefined) updateData.notes = parsed.notes;
  if (parsed.terms !== undefined) updateData.terms = parsed.terms;
  if (parsed.discount !== undefined) updateData.discount = String(parsed.discount);
  if (parsed.tax !== undefined) updateData.tax = String(parsed.tax);
  if (parsed.invoiceNumber !== undefined) {
    if (currentInvoice.status !== "draft") throw new Error("Nomor invoice hanya dapat diubah saat draft / Invoice number can only be changed while draft");
    updateData.invoiceNumber = normalizeInvoiceNumber(parsed.invoiceNumber) ?? currentInvoice.invoiceNumber;
  }

  let inv;
  try {
    inv = await db.transaction(async (tx) => {
      const [locked] = await tx.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId))).for("update").limit(1);
      if (!locked) throw new Error("Invoice tidak ditemukan");
      const [updated] = await tx.update(invoices).set(updateData).where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId))).returning();
      if (parsed.status === "paid") {
        const [paidResult] = await tx.select({ total: sql<string>`coalesce(sum(${payments.amount}), '0')` }).from(payments).where(eq(payments.invoiceId, invoiceId));
        const remaining = Number(updated.total ?? 0) - Number(paidResult?.total ?? 0);
        if (remaining > 0) await tx.insert(payments).values({ invoiceId, amount: String(remaining), paidAt: new Date().toISOString().slice(0, 10), method: null, notes: "Penandaan lunas otomatis" });
      }
      return updated;
    });
  } catch (err) {
    if (isInvoiceNumberUniqueConstraint(err)) throw new Error(invoiceNumberTakenMessage(String(updateData.invoiceNumber)));
    throw err;
  }

  await writeActivityLog(workspaceId, user.id, "updated_invoice", "invoice", invoiceId);

  return inv;
}
type InvoiceTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
async function revertInvoiceTimeEntrySources(executor: InvoiceTx, workspaceId: string, invoiceId: string) {
  const linkedTimeEntryIds = await executor
    .select({ sourceId: invoiceItems.sourceId, previousTimeEntryStatus: invoiceItems.previousTimeEntryStatus })
    .from(invoiceItems)
    .where(and(eq(invoiceItems.invoiceId, invoiceId), eq(invoiceItems.sourceType, "time_entry")));

  for (const row of linkedTimeEntryIds) {
    if (!row.sourceId) continue;
    await executor
      .update(timeEntries)
      .set({ status: row.previousTimeEntryStatus ?? "approved", updatedAt: new Date() })
      .where(and(eq(timeEntries.id, row.sourceId), eq(timeEntries.workspaceId, workspaceId), eq(timeEntries.status, "invoiced")));
  }
}

export async function cancelDraftInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const inv = await assertInvoiceInWorkspace(invoiceId, workspaceId);
  if (inv.status !== "draft") throw new Error("Hanya draft invoice yang bisa dibatalkan dari aksi ini");

  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
      .for("update")
      .limit(1);
    if (locked?.status !== "draft") throw new Error("Hanya draft invoice yang bisa dibatalkan dari aksi ini");
    await revertInvoiceTimeEntrySources(tx, workspaceId, invoiceId);
    const cancelled = await tx
      .update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId), eq(invoices.status, "draft")))
      .returning({ id: invoices.id });
    if (cancelled.length !== 1) throw new Error("Status invoice berubah saat pembatalan");
  });

  await writeActivityLog(workspaceId, user.id, "cancelled_draft_invoice", "invoice", invoiceId);
  return { success: true };
}

const voidInvoiceSchema = z.object({
  invoiceId: z.string().uuid(),
  reason: z.string().trim().min(1, "Alasan wajib diisi").max(1000),
});

/**
 * Void a paid or partially paid invoice. Unlike cancelDraftInvoice, this keeps
 * the invoice record, line items, and payment rows intact for audit purposes —
 * only the status moves to "cancelled" and a required reason is recorded in
 * the activity log. Deletion of paid invoices stays disabled.
 */
export async function voidInvoice(input: z.infer<typeof voidInvoiceSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = voidInvoiceSchema.parse(input);
  const inv = await assertInvoiceInWorkspace(parsed.invoiceId, workspaceId);

  if (["cancelled", "archived"].includes(inv.status)) {
    throw new Error("Invoice sudah dibatalkan atau diarsipkan");
  }
  await db.transaction(async (tx) => {
    const [locked] = await tx
      .select({ status: invoices.status })
      .from(invoices)
      .where(and(eq(invoices.id, parsed.invoiceId), eq(invoices.workspaceId, workspaceId)))
      .for("update")
      .limit(1);
    if (!locked || ["cancelled", "archived"].includes(locked.status)) {
      throw new Error("Status invoice berubah saat pembatalan");
    }
    const [paidResult] = await tx.select({ total: sql<string>`coalesce(sum(${payments.amount}), '0')` }).from(payments).where(eq(payments.invoiceId, parsed.invoiceId));
    if (locked.status !== "paid" && Number(paidResult?.total ?? 0) <= 0) throw new Error("Hanya invoice yang sudah dibayar atau sebagian dibayar yang bisa dibatalkan");
    const updated = await tx
      .update(invoices)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(and(eq(invoices.id, parsed.invoiceId), eq(invoices.workspaceId, workspaceId)))
      .returning({ id: invoices.id });
    if (updated.length !== 1) throw new Error("Status invoice berubah saat pembatalan");
  });

  // Payment rows and line items intentionally remain — void is a status change
  // with a required reason, not a deletion.
  await writeActivityLog(workspaceId, user.id, "voided_invoice", "invoice", parsed.invoiceId, {
    reason: parsed.reason,
  });
  return { success: true };
}


export async function recalculateInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const [result] = await db
    .select({
      sum: sql<string>`coalesce(sum(${invoiceItems.amount}), '0')`,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));

  const subtotal = result?.sum || "0";

  const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  const t = await getT();
  if (!inv) throw new Error(t("Invoice tidak ditemukan", "Invoice not found"));

  const totals = calculateInvoiceTotals(
    Number(subtotal),
    Number(inv.discount),
    Number(inv.tax),
  );

  const [updated] = await db
    .update(invoices)
    .set({
      subtotal: String(totals.subtotal),
      discount: String(totals.discount),
      tax: String(totals.tax),
      total: String(totals.total),
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId))
    .returning();

  return updated;
}

type InvoiceTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function recalculateInvoiceInTransaction(tx: InvoiceTransaction, invoiceId: string, workspaceId: string) {
  const [inv] = await tx.select().from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .for("update").limit(1);
  if (!inv) throw new Error("Invoice tidak ditemukan");
  const [result] = await tx.select({ sum: sql<string>`coalesce(sum(${invoiceItems.amount}), '0')` })
    .from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
  const totals = calculateInvoiceTotals(Number(result?.sum || 0), Number(inv.discount), Number(inv.tax));
  await tx.update(invoices).set({ subtotal: String(totals.subtotal), discount: String(totals.discount), tax: String(totals.tax), total: String(totals.total), updatedAt: new Date() })
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)));
}

export async function addInvoiceItem(input: z.infer<typeof addItemSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const invoice = await assertInvoiceInWorkspace(input.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  const parsed = addItemSchema.parse(input);
  const amount = String(parsed.quantity * parsed.unitPrice);

  const item = await db.transaction(async (tx) => {
    const [created] = await tx.insert(invoiceItems).values({
      invoiceId: parsed.invoiceId, description: parsed.description,
      quantity: String(parsed.quantity), unitPrice: String(parsed.unitPrice), amount,
    }).returning();
    await recalculateInvoiceInTransaction(tx, parsed.invoiceId, workspaceId);
    return created;
  });
  await writeActivityLog(workspaceId, user.id, "added_invoice_item", "invoice_item", item.id);
  return item;
}

export async function addProjectInvoiceItem(input: z.infer<typeof addProjectItemSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const parsed = addProjectItemSchema.parse(input);
  const invoice = await assertInvoiceInWorkspace(parsed.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  const [project] = await db.select({ id: projects.id, name: projects.name, clientId: projects.clientId, billingType: projects.billingType, billingModel: projects.billingModel, budget: projects.budget, currency: projects.currency })
    .from(projects).where(and(eq(projects.id, parsed.projectId), eq(projects.workspaceId, workspaceId))).limit(1);
  if (!project) throw new Error("Proyek tidak ditemukan");
  if (project.clientId !== invoice.clientId) throw new Error("Proyek tidak sesuai dengan klien invoice");
  if ((project.billingModel ?? project.billingType) !== "fixed_price" && project.billingType !== "project") throw new Error("Hanya Fixed Price Project yang bisa ditambahkan langsung");

  const [duplicate] = await db.select({ id: invoiceItems.id }).from(invoiceItems).where(and(eq(invoiceItems.invoiceId, parsed.invoiceId), eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, parsed.projectId))).limit(1);
  if (duplicate) throw new Error("Proyek ini sudah ada di invoice");

  const [prior] = await db.select({ amount: sql<string>`coalesce(sum(${invoiceItems.originalAmount}), '0')` }).from(invoiceItems)
    .innerJoin(invoices, eq(invoices.id, invoiceItems.invoiceId))
    .where(and(eq(invoiceItems.sourceType, "project"), eq(invoiceItems.sourceId, project.id), eq(invoices.workspaceId, workspaceId), ne(invoices.status, "cancelled"), ne(invoices.status, "archived")));
  const originalAmount = resolveFixedPriceInvoiceAmount(Number(project.budget ?? 0), Number(prior?.amount ?? 0));
  if (originalAmount <= 0) throw new Error("Nilai Fixed Price Project sudah seluruhnya ditagihkan");

  const [workspace] = await db.select({ defaultCurrency: workspaces.defaultCurrency }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  const rateRows = await db.select({ fromCurrency: workspaceCurrencyRates.fromCurrency, rate: workspaceCurrencyRates.rate }).from(workspaceCurrencyRates).where(eq(workspaceCurrencyRates.workspaceId, workspaceId));
  const converted = convertCurrency(originalAmount, project.currency, invoice.currency, workspace?.defaultCurrency ?? "IDR", buildRateMap(rateRows));
  if (!converted) throw new Error(`Kurs ${project.currency} ke ${invoice.currency} belum tersedia`);

  const [item] = await db.insert(invoiceItems).values({ invoiceId: parsed.invoiceId, description: project.name, quantity: "1", unitPrice: String(converted.amount), amount: String(converted.amount), sourceType: "project", sourceId: project.id, originalCurrency: project.currency, originalAmount: String(originalAmount), conversionRate: String(converted.rate) }).returning();
  await recalculateInvoice(parsed.invoiceId);
  await writeActivityLog(workspaceId, user.id, "added_project_invoice_item", "invoice_item", item.id);
  return item;
}

export async function updateInvoiceItem(itemId: string, input: z.infer<typeof updateItemSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = updateItemSchema.parse(input);

  const [item] = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .limit(1);
  const t = await getT();
  if (!item) throw new Error(t("Item invoice tidak ditemukan", "Invoice item not found"));

  const invoice = await assertInvoiceInWorkspace(item.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  const qty = parsed.quantity !== undefined ? parsed.quantity : Number(item.quantity);
  const price = parsed.unitPrice !== undefined ? parsed.unitPrice : Number(item.unitPrice);

  const updateData: Record<string, unknown> = {};
  if (parsed.description !== undefined) updateData.description = parsed.description;
  if (parsed.quantity !== undefined) updateData.quantity = String(parsed.quantity);
  if (parsed.unitPrice !== undefined) updateData.unitPrice = String(parsed.unitPrice);
  updateData.amount = String(qty * price);

  const updated = await db.transaction(async (tx) => {
    const [changed] = await tx.update(invoiceItems).set(updateData)
      .where(and(eq(invoiceItems.id, itemId), eq(invoiceItems.invoiceId, item.invoiceId))).returning();
    await recalculateInvoiceInTransaction(tx, item.invoiceId, workspaceId);
    return changed;
  });
  await writeActivityLog(workspaceId, user.id, "updated_invoice_item", "invoice_item", itemId);
  return updated;
}

export async function deleteInvoiceItem(itemId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const [item] = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.id, itemId))
    .limit(1);
  const t = await getT();
  if (!item) throw new Error(t("Item invoice tidak ditemukan", "Invoice item not found"));

  const invoice = await assertInvoiceInWorkspace(item.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(invoice.status);

  await db.transaction(async (tx) => {
    await tx.delete(invoiceItems).where(eq(invoiceItems.id, itemId));

    // Restore time entry so it can be re-imported (was stuck as "invoiced").
    if (item.sourceType === "time_entry" && item.sourceId) {
      const [stillLinked] = await tx
        .select({ id: invoiceItems.id })
        .from(invoiceItems)
        .where(
          and(
            eq(invoiceItems.sourceType, "time_entry"),
            eq(invoiceItems.sourceId, item.sourceId),
          ),
        )
        .limit(1);

      if (!stillLinked) {
        const previousStatus = item.previousTimeEntryStatus ?? "approved";
        await tx
          .update(timeEntries)
          .set({ status: previousStatus, updatedAt: new Date() })
          .where(
            and(
              eq(timeEntries.id, item.sourceId),
              eq(timeEntries.workspaceId, workspaceId),
              eq(timeEntries.status, "invoiced"),
            ),
          );
      }
    }
    await recalculateInvoiceInTransaction(tx, item.invoiceId, workspaceId);
  });

  await writeActivityLog(workspaceId, user.id, "deleted_invoice_item", "invoice_item", itemId);
  return { success: true };
}

// ─── Import Time Entries ───

export async function importTimeEntries(input: z.infer<typeof importTimeSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);

  const parsed = importTimeSchema.parse(input);
  const inv = await assertInvoiceInWorkspace(parsed.invoiceId, workspaceId);
  assertInvoiceFinancialsMutable(inv.status);

  const uniqueIds = Array.from(new Set(parsed.timeEntryIds));
  if (!uniqueIds.length || uniqueIds.length !== parsed.timeEntryIds.length) {
    throw new Error("Pilih Time Entry unik minimal satu");
  }

  await db.transaction(async (tx) => {
    const entries = await tx
      .select({
        id: timeEntries.id,
        projectId: timeEntries.projectId,
        clientId: timeEntries.clientId,
        description: timeEntries.description,
        durationMinutes: timeEntries.durationMinutes,
        hourlyRate: timeEntries.hourlyRate,
        projectName: projects.name,
        billingModel: projects.billingModel,
        billingType: projects.billingType,
      })
      .from(timeEntries)
      .leftJoin(
        projects,
        and(
          eq(projects.id, timeEntries.projectId),
          eq(projects.workspaceId, timeEntries.workspaceId),
        ),
      )
      .where(
        and(
          inArray(timeEntries.id, uniqueIds),
          eq(timeEntries.workspaceId, workspaceId),
          eq(timeEntries.clientId, inv.clientId),
          eq(timeEntries.status, "approved"),
          eq(timeEntries.billable, true),
          isNotNull(timeEntries.endTime),
          sql`${timeEntries.durationMinutes} > 0`,
          inv.projectId ? eq(timeEntries.projectId, inv.projectId) : sql`true`,
        ),
      )
      .for("update");

    if (entries.length !== uniqueIds.length) {
      throw new Error("Semua Time Entry harus approved, billable, selesai, berdurasi positif, dan sesuai invoice");
    }
    if (entries.some((entry) => !entry.hourlyRate || Number(entry.hourlyRate) <= 0)) {
      throw new Error("Time Entry belum memiliki billing rate snapshot");
    }
    for (const entry of entries) {
      assertBillingModelAllowsTimeInvoice(resolveBillingModel(entry));
    }

    const existingLinks = await tx
      .select({ sourceId: invoiceItems.sourceId })
      .from(invoiceItems)
      .where(
        and(
          eq(invoiceItems.sourceType, "time_entry"),
          inArray(invoiceItems.sourceId, uniqueIds),
        ),
      );
    if (existingLinks.length) throw new Error("Ada Time Entry yang sudah ditagihkan");

    await tx.insert(invoiceItems).values(entries.map((entry) => {
      const hours = Number(entry.durationMinutes) / 60;
      const rate = Number(entry.hourlyRate);
      const workDesc = (entry.description || "").trim() || "Time entry";
      return {
        invoiceId: parsed.invoiceId,
        description: entry.projectName ? `${entry.projectName} — ${workDesc}` : workDesc,
        quantity: String(hours),
        unitPrice: String(rate),
        amount: String(hours * rate),
        sourceType: "time_entry" as const,
        sourceId: entry.id,
        previousTimeEntryStatus: "approved" as const,
      };
    }));

    await tx
      .update(timeEntries)
      .set({ status: "invoiced", updatedAt: new Date() })
      .where(
        and(
          inArray(timeEntries.id, uniqueIds),
          eq(timeEntries.status, "approved"),
        ),
      );

    const [result] = await tx
      .select({ sum: sql<string>`coalesce(sum(${invoiceItems.amount}), '0')` })
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, parsed.invoiceId));
    const totals = calculateInvoiceTotals(
      Number(result?.sum || 0),
      Number(inv.discount),
      Number(inv.tax),
    );
    await tx
      .update(invoices)
      .set({
        subtotal: String(totals.subtotal),
        discount: String(totals.discount),
        tax: String(totals.tax),
        total: String(totals.total),
        updatedAt: new Date(),
      })
      .where(eq(invoices.id, parsed.invoiceId));
  });
  await writeActivityLog(workspaceId, user.id, "imported_time_to_invoice", "invoice", parsed.invoiceId);
  return { success: true };
}

// ─── Payments ───

export async function recordPayment(input: z.infer<typeof recordPaymentSchema>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(input.invoiceId, workspaceId);

  const parsed = recordPaymentSchema.parse(input);

  const payment = await db.transaction(async (tx) => {
    const [inv] = await tx.select().from(invoices).where(and(eq(invoices.id, parsed.invoiceId), eq(invoices.workspaceId, workspaceId))).for("update").limit(1);
    if (!inv) throw new Error("Invoice tidak ditemukan");
    const [paidResult] = await tx.select({ total: sql<string>`coalesce(sum(${payments.amount}), '0')` }).from(payments).where(eq(payments.invoiceId, parsed.invoiceId));
    assertPaymentWithinRemaining(parsed.amount, Number(inv.total), Number(paidResult?.total ?? 0));
    const [created] = await tx.insert(payments).values({ invoiceId: parsed.invoiceId, amount: String(parsed.amount), paidAt: parsed.paidAt, method: parsed.method || null, notes: parsed.notes || null }).returning();
    return created;
  });

  await writeActivityLog(workspaceId, user.id, "recorded_payment", "payment", payment.id);
  return payment;
}

// ─── Send / Shared Token ───

async function sendInvoiceEmailForInvoice(
  invoiceId: string,
  actorId: string,
  workspaceId: string,
  message?: string,
  reportRange?: { from: string; to: string },
) {
  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);
  const t = await getT();
  if (!inv) throw new Error(t("Invoice tidak ditemukan", "Invoice not found"));

  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  if (!client?.email) throw new Error(t("Email klien belum diisi", "Client email is missing"));

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  let projectName: string | undefined;
  if (inv.projectId) {
    const [proj] = await db
      .select({ name: projects.name })
      .from(projects)
      .where(eq(projects.id, inv.projectId))
      .limit(1);
    projectName = proj?.name;
  }

  // Raw share tokens shown once — rotate fresh link each send.
  const generated = await generateInvoiceShareToken(invoiceId);
  // Mark sent before email so public PDF link works immediately.
  if (inv.status !== "paid") {
    await db
      .update(invoices)
      .set({ status: "sent", updatedAt: new Date() })
      .where(eq(invoices.id, invoiceId));
  }

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://cubiqlo.com"
  ).replace(/\/$/, "");
  // Same PDF layout as /api/invoices/:id/pdf (Unduh PDF) — public via share token.
  const portalUrl = `${appUrl}/api/invoices/share/${generated.token}/pdf`;
  let detailReportUrl: string | null = null;
  if (reportRange) {
    const range = normalizeInvoiceReportRange(reportRange.from, reportRange.to);
    const secret = process.env.BETTER_AUTH_SECRET;
    if (!secret) throw new Error("Server secret belum dikonfigurasi");
    detailReportUrl = buildInvoiceReportUrl(
      appUrl,
      generated.token,
      range,
      signInvoiceReportRange(generated.token, range, secret),
    );
  }
  const replyTo = await resolveWorkspaceReplyTo(workspaceId);
  await notifyInvoiceSent({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    portalUrl,
    workspaceName: ws?.name,
    replyTo,
    projectName,
    dueDate: inv.dueDate ? String(inv.dueDate).slice(0, 10) : null,
    customBody: message ? validateInvoiceMessage(message) : null,
    detailReportUrl,
  });

  await writeActivityLog(workspaceId, actorId, "sent_invoice_email", "invoice", invoiceId, {
    clientEmail: client.email,
    portalUrl,
  });

  try {
    await notifyWorkspaceMembers(workspaceId, {
      type: "invoice_sent",
      title: `Invoice ${inv.invoiceNumber} sent`,
      body: `${client.name} · ${formatMoney(inv.total, inv.currency || "IDR")}`,
      link: `/app/invoices/${invoiceId}`,
      entityType: "invoice",
      entityId: invoiceId,
      actorId,
    });
  } catch {
    // best-effort
  }

  return { success: true, portalUrl };
}

export async function sendInvoiceEmail(
  invoiceId: string,
  message: string,
  reportRange?: { from: string; to: string },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);
  return sendInvoiceEmailForInvoice(
    invoiceId,
    user.id,
    workspaceId,
    validateInvoiceMessage(message),
    reportRange,
  );
}

export async function generateInvoiceShareToken(invoiceId: string, expiresAt?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await db
    .update(invoices)
    .set({
      sharedTokenHash: tokenHash,
      sharedTokenEnc: encryptSecret(rawToken),
      sharedTokenExpiresAt: expiry,
      sharedTokenRevokedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "generated_invoice_share_token", "invoice", invoiceId);
  return { token: rawToken, expiresAt: expiry };
}

export async function revokeInvoiceShareToken(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  await assertInvoiceInWorkspace(invoiceId, workspaceId);

  await db
    .update(invoices)
    .set({
      sharedTokenRevokedAt: new Date(),
      sharedTokenEnc: null,
      updatedAt: new Date(),
    })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "revoked_invoice_share_token", "invoice", invoiceId);
  return { success: true };
}

export async function markOverdueInvoices(workspaceId?: string) {
  const today = new Date().toISOString().slice(0, 10);
  const conditions = [
    lt(invoices.dueDate, today),
    inArray(invoices.status, ["sent", "viewed"]),
  ];
  if (workspaceId) conditions.push(eq(invoices.workspaceId, workspaceId));

  const updated = await db
    .update(invoices)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(and(...conditions))
    .returning({ id: invoices.id, workspaceId: invoices.workspaceId, invoiceNumber: invoices.invoiceNumber });

  for (const inv of updated) {
    await writeActivityLog(inv.workspaceId, null, "marked_invoice_overdue", "invoice", inv.id);
    try {
      await notifyWorkspaceMembers(inv.workspaceId, {
        type: "invoice_overdue",
        title: `Invoice ${inv.invoiceNumber} is overdue`,
        body: "Payment reminder may be sent from invoice detail.",
        link: `/app/invoices/${inv.id}`,
        entityType: "invoice",
        entityId: inv.id,
      });
    } catch {
      // best-effort
    }
  }

  return { updated: updated.length, invoices: updated };
}

export async function sendInvoicePaymentReminder(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceWritable(db, user.id, workspaceId);
  const inv = await assertInvoiceInWorkspace(invoiceId, workspaceId);
  if (["paid", "cancelled", "draft"].includes(inv.status)) {
    throw new Error("Only sent, viewed, or overdue invoices can receive reminders");
  }

  const [client] = await db
    .select({ name: clients.name, email: clients.email })
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);
  const t = await getT();
  if (!client?.email) throw new Error(t("Email klien belum diisi", "Client email is missing"));

  const [ws] = await db
    .select({ name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const generated = await generateInvoiceShareToken(invoiceId);
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.BETTER_AUTH_URL ??
    "https://cubiqlo.com"
  ).replace(/\/$/, "");
  const portalUrl = `${appUrl}/api/invoices/share/${generated.token}/pdf`;
  const replyTo = await resolveWorkspaceReplyTo(workspaceId);

  await notifyInvoicePaymentReminder({
    clientEmail: client.email,
    clientName: client.name ?? "there",
    invoiceNumber: inv.invoiceNumber ?? invoiceId.slice(0, 8),
    amount: formatMoney(inv.total, inv.currency || "IDR"),
    dueDate: inv.dueDate ? String(inv.dueDate) : null,
    portalUrl,
    workspaceName: ws?.name,
    replyTo,
  });

  await db
    .update(invoices)
    .set({ status: inv.status === "paid" ? inv.status : "overdue", updatedAt: new Date() })
    .where(eq(invoices.id, invoiceId));

  await writeActivityLog(workspaceId, user.id, "sent_invoice_payment_reminder", "invoice", invoiceId, {
    clientEmail: client.email,
    portalUrl,
  });

  try {
    // One-shot event (user clicked send reminder) — not a recurring overdue ping.
    await notifyWorkspaceMembers(workspaceId, {
      type: "invoice_sent",
      title: `Reminder sent for ${inv.invoiceNumber}`,
      body: `${client.name} · ${formatMoney(inv.total, inv.currency || "IDR")}`,
      link: `/app/invoices/${invoiceId}`,
      entityType: "invoice",
      entityId: invoiceId,
      actorId: user.id,
      dedupe: false,
    });
  } catch {
    // best-effort
  }

  return { success: true, portalUrl };
}

// ─── Queries ───

export async function listInvoices(workspaceId: string, clientId?: string, status?: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const wsId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, wsId);

  const conditions = [eq(invoices.workspaceId, wsId)];
  if (clientId) conditions.push(eq(invoices.clientId, clientId));
  if (status) conditions.push(eq(invoices.status, status as typeof invoices.status.enumValues[number]));

  const results = await db
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
    })
    .from(invoices)
    .leftJoin(clients, eq(clients.id, invoices.clientId))
    .where(and(...conditions))
    .orderBy(desc(invoices.createdAt));

  return results;
}

export async function getInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  await assertWorkspaceMember(db, user.id, workspaceId);

  const [inv] = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.id, invoiceId), eq(invoices.workspaceId, workspaceId)))
    .limit(1);

  const t = await getT();
  if (!inv) throw new Error(t("Invoice tidak ditemukan", "Invoice not found"));

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

  return { ...inv, items, payments: pays, client: client || null };
}

export async function getInvoiceBySharedToken(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");

  const [inv] = await db
    .select()
    .from(invoices)
    .where(eq(invoices.sharedTokenHash, tokenHash))
    .limit(1);

  if (!inv) throw new Error("Invalid or expired share link");

  if (inv.sharedTokenRevokedAt) throw new Error("This share link has been revoked");
  if (inv.sharedTokenExpiresAt && new Date(inv.sharedTokenExpiresAt) < new Date()) {
    throw new Error("This share link has expired");
  }

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, inv.id));

  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, inv.clientId))
    .limit(1);

  const [ws] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, inv.workspaceId))
    .limit(1);

  return { ...inv, items, client: client || null, workspace: ws || null };
}

export async function deleteInvoice(invoiceId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = requireUser(session?.user);
  const workspaceId = await getWorkspaceId();
  const inv = await assertInvoiceInWorkspace(invoiceId, workspaceId);

  // Only allow deletion for draft invoices — sent/paid invoices must be cancelled first
  if (!["draft", "cancelled"].includes(inv.status)) {
    throw new Error("Hanya invoice draf atau dibatalkan yang bisa dihapus");
  }

  await db.transaction(async (tx) => {
    await revertInvoiceTimeEntrySources(tx, workspaceId, invoiceId);
    // Delete invoice items after restoring linked time entries.
    await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    // Delete payments if any
    await tx.delete(payments).where(eq(payments.invoiceId, invoiceId));
    // Delete the invoice
    await tx.delete(invoices).where(eq(invoices.id, invoiceId));
  });

  await writeActivityLog(workspaceId, user.id, "deleted_invoice", "invoice", invoiceId);
  return { success: true };
}
