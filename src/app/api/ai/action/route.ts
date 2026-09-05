/** Execute a user-confirmed AI Assistant action. */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, ne, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, invoices, tasks } from "@/db/schema";
import { assertClientInWorkspace, assertProjectInWorkspace, assertTaskInWorkspace, assertWorkspaceWritable } from "@/lib/access";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { enforcePlanApiRateLimit } from "@/lib/plan-api-rate-limit";
import { checkAiRateLimitDb, getAiEntitlementFailure, getUserPlan, releaseAiQuota } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const taskStatuses = new Set(["todo", "in_progress", "review", "done"]);

interface UpdateTaskPayload {
  taskId: string;
  newStatus: "todo" | "in_progress" | "review" | "done";
}
interface DraftReminderPayload {
  invoiceId: string;
  subject: string;
  body: string;
  to: string | null;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limited = await enforceRateLimitResponse(req, "ai:action", { limit: 30, windowSec: 60 }, { identity: session.user.id });
  if (limited) return limited;
  const plan = await getUserPlan(session.user.id);
  const entitlementFailure = getAiEntitlementFailure(plan);
  if (entitlementFailure) {
    return NextResponse.json({ error: entitlementFailure.error }, { status: entitlementFailure.status });
  }

  let request: { kind: string; payload: unknown; messageId?: string };
  try {
    request = (await req.json()) as { kind: string; payload: unknown; messageId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Workspace that holds a quota reservation (set right after a successful
  // checkAiRateLimitDb). If execution fails AFTER reserving, we refund it in
  // the catch below. Once the action succeeds the request is spent — no
  // refund (see checkAiRateLimitDb boundary note).
  let quotaWorkspaceId: string | null = null;

  try {
    const markDone = async () => {
      if (request.messageId) {
        try {
          const { updateMessageConfirmationStatus } = await import("@/lib/ai/conv-store");
          await updateMessageConfirmationStatus(request.messageId, "done");
        } catch {
          // ignore
        }
      }
    };
    if (request.kind === "update_task_status") {
      const p = request.payload as UpdateTaskPayload;
      if (!p?.taskId || !taskStatuses.has(p.newStatus)) {
        return NextResponse.json({ error: "Invalid task update" }, { status: 400 });
      }
      const [task] = await db.select({ id: tasks.id, workspaceId: tasks.workspaceId, status: tasks.status })
        .from(tasks).where(eq(tasks.id, p.taskId)).limit(1);
      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
      await assertWorkspaceWritable(db, session.user.id, task.workspaceId);
      const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId: task.workspaceId });
      if (apiLimited) return apiLimited;
      const aiRate = await checkAiRateLimitDb(task.workspaceId, plan);
      if (!aiRate.allowed) {
        return NextResponse.json(
          { error: `Batas AI bulanan tercapai (${aiRate.limit}/bulan). Reset ${new Date(aiRate.resetAt).toISOString()}.` },
          { status: 429 },
        );
      }
      quotaWorkspaceId = task.workspaceId;

      const [updated] = await db.update(tasks)
        .set({ status: p.newStatus, updatedAt: new Date() })
        .where(and(eq(tasks.id, p.taskId), ne(tasks.status, p.newStatus)))
        .returning({ id: tasks.id, title: tasks.title, status: tasks.status });
      if (updated) {
        await db.insert(activityLogs).values({
          workspaceId: task.workspaceId,
          actorId: session.user.id,
          action: "ai.task_status_updated",
          entityType: "task",
          entityId: task.id,
          metadata: { previousStatus: task.status, newStatus: p.newStatus },
        });
      }
      await markDone();
      return NextResponse.json({ ok: true, result: { task: updated ?? { id: task.id, status: task.status }, replayed: !updated } });
    }

    if (request.kind === "draft_invoice_reminder") {
      const p = request.payload as DraftReminderPayload;
      if (!p?.invoiceId || !p.subject?.trim() || !p.body?.trim()) {
        return NextResponse.json({ error: "Invalid reminder draft" }, { status: 400 });
      }
      const [invoice] = await db.select({ id: invoices.id, workspaceId: invoices.workspaceId })
        .from(invoices).where(eq(invoices.id, p.invoiceId)).limit(1);
      if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      await assertWorkspaceWritable(db, session.user.id, invoice.workspaceId);
      const apiLimited = await enforcePlanApiRateLimit(req, { userId: session.user.id, workspaceId: invoice.workspaceId });
      if (apiLimited) return apiLimited;
      const aiRate = await checkAiRateLimitDb(invoice.workspaceId, plan);
      if (!aiRate.allowed) {
        return NextResponse.json(
          { error: `Batas AI bulanan tercapai (${aiRate.limit}/bulan). Reset ${new Date(aiRate.resetAt).toISOString()}.` },
          { status: 429 },
        );
      }
      quotaWorkspaceId = invoice.workspaceId;
      await db.insert(activityLogs).values({
        workspaceId: invoice.workspaceId,
        actorId: session.user.id,
        action: "ai.invoice_reminder_draft_confirmed",
        entityType: "invoice",
        entityId: invoice.id,
        metadata: { recipientAvailable: Boolean(p.to) },
      });
      await markDone();
      return NextResponse.json({ ok: true, result: { draft: { invoiceId: p.invoiceId, to: p.to, subject: p.subject, body: p.body } } });
    }

    if (request.kind === "create_client") {
      const p = request.payload as { name: string; companyName?: string | null; email?: string | null; phone?: string | null };
      if (!p?.name?.trim()) return NextResponse.json({ error: "Client name is required" }, { status: 400 });
      const { getWorkspaceForCurrentUser } = await import("@/lib/workspace");
      const wsId = await getWorkspaceForCurrentUser();
      await assertWorkspaceWritable(db, session.user.id, wsId);
      const { checkEntityLimit } = await import("@/lib/plan");
      const clientLimit = await checkEntityLimit(wsId, "clients", plan);
      if (!clientLimit.allowed) {
        return NextResponse.json({ error: clientLimit.reason ?? "Client limit reached" }, { status: 400 });
      }
      const { clients } = await import("@/db/schema");
      const clientId = crypto.randomUUID();
      const [created] = await db.insert(clients).values({
        id: clientId,
        workspaceId: wsId,
        name: p.name.trim(),
        companyName: p.companyName?.trim() || null,
        email: p.email?.trim() || null,
        phone: p.phone?.trim() || null,
        status: "active",
      }).returning({ id: clients.id, name: clients.name });

      await db.insert(activityLogs).values({
        workspaceId: wsId,
        actorId: session.user.id,
        action: "ai.client_created",
        entityType: "client",
        entityId: clientId,
        metadata: { name: p.name.trim() },
      });
      await markDone();
      return NextResponse.json({ ok: true, result: { client: created } });
    }

    if (request.kind === "create_project") {
      const p = request.payload as { name: string; clientId: string; billingModel?: string; budget?: number; dueDate?: string };
      if (!p?.name?.trim() || !p?.clientId) return NextResponse.json({ error: "Project name and client are required" }, { status: 400 });
      const { getWorkspaceForCurrentUser } = await import("@/lib/workspace");
      const wsId = await getWorkspaceForCurrentUser();
      await assertWorkspaceWritable(db, session.user.id, wsId);
      await assertClientInWorkspace(db, session.user.id, wsId, p.clientId);
      const { checkEntityLimit } = await import("@/lib/plan");
      const projLimit = await checkEntityLimit(wsId, "projects", plan);
      if (!projLimit.allowed) {
        return NextResponse.json({ error: projLimit.reason ?? "Project limit reached" }, { status: 400 });
      }
      const { projects } = await import("@/db/schema");
      const projectId = crypto.randomUUID();
      const [created] = await db.insert(projects).values({
        id: projectId,
        workspaceId: wsId,
        clientId: p.clientId,
        name: p.name.trim(),
        status: "active",
        billingModel: (p.billingModel as "fixed_price" | "hourly" | "retainer") || "fixed_price",
        billingType: (p.billingModel as "fixed_price" | "hourly" | "retainer") || "fixed_price",
        budget: p.budget != null ? String(p.budget) : null,
        dueDate: p.dueDate || null,
        currency: "IDR",
        activityRequired: false,
        clientVisible: true,
      }).returning({ id: projects.id, name: projects.name });

      await db.insert(activityLogs).values({
        workspaceId: wsId,
        actorId: session.user.id,
        action: "ai.project_created",
        entityType: "project",
        entityId: projectId,
        metadata: { name: p.name.trim(), clientId: p.clientId },
      });
      await markDone();
      return NextResponse.json({ ok: true, result: { project: created } });
    }

    if (request.kind === "create_invoice") {
      const p = request.payload as {
        clientId: string;
        projectId?: string;
        dueDate?: string;
        currency?: string;
        items: Array<{ description: string; quantity: number; unitPrice: number }>;
        total: number;
      };
      if (!p?.clientId || !p?.items || p.items.length === 0) {
        return NextResponse.json({ error: "Client and invoice items are required" }, { status: 400 });
      }
      const { getWorkspaceForCurrentUser } = await import("@/lib/workspace");
      const wsId = await getWorkspaceForCurrentUser();
      await assertWorkspaceWritable(db, session.user.id, wsId);
      await assertClientInWorkspace(db, session.user.id, wsId, p.clientId);
      if (p.projectId) {
        const project = await assertProjectInWorkspace(db, session.user.id, wsId, p.projectId);
        if (project.clientId !== p.clientId) return NextResponse.json({ error: "Project does not belong to client" }, { status: 400 });
      }
      const { checkEntityLimit } = await import("@/lib/plan");
      const invLimit = await checkEntityLimit(wsId, "invoices", plan);
      if (!invLimit.allowed) {
        return NextResponse.json({ error: invLimit.reason ?? "Invoice limit reached" }, { status: 400 });
      }

      const { invoices, invoiceItems, workspaceInvoiceCounters } = await import("@/db/schema");
      const invoiceId = crypto.randomUUID();
      const [counter] = await db.insert(workspaceInvoiceCounters)
        .values({ workspaceId: wsId, nextNumber: 2 })
        .onConflictDoUpdate({
          target: workspaceInvoiceCounters.workspaceId,
          set: {
            nextNumber: sql`${workspaceInvoiceCounters.nextNumber} + 1`,
            updatedAt: new Date(),
          },
        })
        .returning({ nextNumber: workspaceInvoiceCounters.nextNumber });
      const allocatedNumber = counter.nextNumber - 1;
      const invoiceNumber = `INV-${String(allocatedNumber).padStart(4, "0")}`;

      const totalAmount = p.items.reduce((sum, it) => sum + (it.quantity * it.unitPrice), 0);
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDate = p.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

      const [created] = await db.insert(invoices).values({
        id: invoiceId,
        workspaceId: wsId,
        clientId: p.clientId,
        projectId: p.projectId || null,
        invoiceNumber,
        issueDate,
        dueDate,
        currency: p.currency || "IDR",
        subtotal: String(totalAmount),
        discount: "0",
        tax: "0.00",
        total: String(totalAmount),
        status: "draft",
        notes: "Dibuat via AI Assistant",
      }).returning({ id: invoices.id, invoiceNumber: invoices.invoiceNumber });

      for (const it of p.items) {
        await db.insert(invoiceItems).values({
          invoiceId,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
          amount: String(it.quantity * it.unitPrice),
          sourceType: "manual",
        });
      }

      await db.insert(activityLogs).values({
        workspaceId: wsId,
        actorId: session.user.id,
        action: "ai.invoice_created",
        entityType: "invoice",
        entityId: invoiceId,
        metadata: { invoiceNumber, total: totalAmount },
      });
      await markDone();
      return NextResponse.json({ ok: true, result: { invoice: created } });
    }

    if (request.kind === "create_task") {
      const p = request.payload as {
        title: string;
        description?: string | null;
        projectId?: string | null;
        priority?: "low" | "medium" | "high" | "urgent";
        dueDate?: string | null;
      };
      if (!p?.title?.trim()) return NextResponse.json({ error: "Task title is required" }, { status: 400 });
      const { getWorkspaceForCurrentUser } = await import("@/lib/workspace");
      const wsId = await getWorkspaceForCurrentUser();
      await assertWorkspaceWritable(db, session.user.id, wsId);
      if (!p.projectId) return NextResponse.json({ error: "Project is required" }, { status: 400 });
      await assertProjectInWorkspace(db, session.user.id, wsId, p.projectId);

      const { projects, tasks } = await import("@/db/schema");

      // Resolve a valid project in workspace if not specified
      let resolvedProjectId = p.projectId;
      if (!resolvedProjectId) {
        const [firstProj] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(eq(projects.workspaceId, wsId))
          .limit(1);
        if (!firstProj) {
          return NextResponse.json({ error: "No projects found in workspace. Please create a project first." }, { status: 400 });
        }
        resolvedProjectId = firstProj.id;
      }

      const taskId = crypto.randomUUID();
      const [created] = await db.insert(tasks).values({
        id: taskId,
        workspaceId: wsId,
        projectId: resolvedProjectId,
        title: p.title.trim(),
        description: p.description?.trim() || null,
        status: "todo",
        priority: p.priority || "medium",
        dueDate: p.dueDate || null,
        assigneeId: session.user.id,
        mode: "workflow",
        lifecycle: "active",
        behavior: "one_time",
        position: 0,
      }).returning({ id: tasks.id, title: tasks.title });

      await db.insert(activityLogs).values({
        workspaceId: wsId,
        actorId: session.user.id,
        action: "ai.task_created",
        entityType: "task",
        entityId: taskId,
        metadata: { title: p.title.trim(), projectId: resolvedProjectId },
      });
      await markDone();
      return NextResponse.json({ ok: true, result: { task: created } });
    }

    if (request.kind === "start_timer") {
      const p = request.payload as { taskId?: string; projectId?: string; clientId?: string; description?: string };
      const { getWorkspaceForCurrentUser } = await import("@/lib/workspace");
      const wsId = await getWorkspaceForCurrentUser();
      await assertWorkspaceWritable(db, session.user.id, wsId);
      if (p.taskId) await assertTaskInWorkspace(db, session.user.id, wsId, p.taskId);
      if (p.projectId) await assertProjectInWorkspace(db, session.user.id, wsId, p.projectId);
      if (p.clientId) await assertClientInWorkspace(db, session.user.id, wsId, p.clientId);
      const { timeEntries } = await import("@/db/schema");

      // Stop existing running timer if any
      await db.update(timeEntries)
        .set({ endTime: new Date(), updatedAt: new Date() })
        .where(and(eq(timeEntries.workspaceId, wsId), eq(timeEntries.userId, session.user.id), sql`${timeEntries.endTime} IS NULL`));

      const entryId = crypto.randomUUID();
      const [created] = await db.insert(timeEntries).values({
        id: entryId,
        workspaceId: wsId,
        userId: session.user.id,
        taskId: p.taskId || null,
        projectId: p.projectId || null,
        clientId: p.clientId || null,
        description: p.description?.trim() || "Waktu kerja via AI Assistant",
        startTime: new Date(),
        workDate: new Date().toISOString().slice(0, 10),
        billable: true,
        status: "draft",
      }).returning({ id: timeEntries.id });

      await markDone();
      return NextResponse.json({ ok: true, result: { timer: created } });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("AI action failed", error);
    // Refund the quota reservation made by checkAiRateLimitDb above — the
    // action never completed, so the reservation must not be left counted
    // against the monthly cap. Refund is best-effort; never mask the error.
    if (quotaWorkspaceId) {
      try {
        await releaseAiQuota(quotaWorkspaceId);
      } catch {
        // best-effort refund
      }
    }
    const status = error instanceof Error && error.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ error: "Action could not be completed" }, { status });
  }
}
