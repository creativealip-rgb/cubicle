/** Execute a user-confirmed AI Assistant action. */
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, ne } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { activityLogs, invoices, tasks } from "@/db/schema";
import { assertWorkspaceWritable } from "@/lib/access";
import { enforceRateLimitResponse } from "@/lib/distributed-rate-limit";
import { enforcePlanApiRateLimit } from "@/lib/plan-api-rate-limit";
import { checkAiRateLimitDb, getAiEntitlementFailure, getUserPlan } from "@/lib/plan";

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

  let request: { kind: string; payload: unknown };
  try {
    request = (await req.json()) as { kind: string; payload: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
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
      await db.insert(activityLogs).values({
        workspaceId: invoice.workspaceId,
        actorId: session.user.id,
        action: "ai.invoice_reminder_draft_confirmed",
        entityType: "invoice",
        entityId: invoice.id,
        metadata: { recipientAvailable: Boolean(p.to) },
      });
      return NextResponse.json({ ok: true, result: { draft: { invoiceId: p.invoiceId, to: p.to, subject: p.subject, body: p.body } } });
    }

    return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
  } catch (error) {
    console.error("AI action failed", error);
    const status = error instanceof Error && error.name === "ForbiddenError" ? 403 : 500;
    return NextResponse.json({ error: "Action could not be completed" }, { status });
  }
}
