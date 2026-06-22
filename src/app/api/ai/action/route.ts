/**
 * Action confirm endpoint — executes a proposed action after user clicks Confirm.
 * POST /api/ai/action
 * Body: { kind, payload }
 *   kind: "update_task_status" | "draft_invoice_reminder"
 *   payload: { taskId, newStatus } | { invoiceId, subject, body, to }
 *
 * Returns: { ok, result }
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { sendNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { kind: string; payload: unknown };
  try {
    body = (await req.json()) as { kind: string; payload: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    if (body.kind === "update_task_status") {
      const p = body.payload as UpdateTaskPayload;
      if (!p.taskId || !p.newStatus) {
        return NextResponse.json({ error: "Missing taskId/newStatus" }, { status: 400 });
      }
      const [updated] = await db
        .update(tasks)
        .set({ status: p.newStatus, updatedAt: new Date() })
        .where(eq(tasks.id, p.taskId))
        .returning({ id: tasks.id, title: tasks.title, status: tasks.status });
      if (!updated) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, result: { task: updated } });
    }

    if (body.kind === "draft_invoice_reminder") {
      const p = body.payload as DraftReminderPayload;
      if (!p.invoiceId || !p.to || !p.subject || !p.body) {
        return NextResponse.json(
          { error: "Missing invoiceId/to/subject/body" },
          { status: 400 },
        );
      }
      // Send via existing email helper. If RESEND_API_KEY not set, returns
      // { success: true, fallback: "console" } — recorded in dev mode.
      const sendResult = await sendNotification({
        to: p.to,
        subject: p.subject,
        text: p.body,
        type: "ai-invoice-reminder",
      });
      return NextResponse.json({ ok: true, result: { sent: sendResult } });
    }

    return NextResponse.json({ error: `Unknown kind: ${body.kind}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
